const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { ChatOpenAI } = require('@langchain/openai');
const { StructuredOutputParser } = require('@langchain/core/output_parsers');
const { PromptTemplate } = require('@langchain/core/prompts');
const { z } = require('zod');

// 检查必需的环境变量
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set in environment variables');
  console.error('Please add OPENAI_API_KEY=your-api-key to your .env file');
  process.exit(1);
}

console.log('✅ OpenAI API Key loaded:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');

// IP白名单中间件
const ipWhitelist = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
  
  const allowedIPs = [
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    'localhost',
    '::ffff:localhost',
    process.env.MAIN_SERVER_IP || '10.0.0.100',
    process.env.DEV_MACHINE_IP || '192.168.1.100'
  ];

  const isAllowed = allowedIPs.some(allowedIP => 
    allowedIP === clientIP || (clientIP?.includes('::ffff:') && allowedIP === clientIP.replace('::ffff:', ''))
  );

  console.log(`🔍 IP Check - Client: ${clientIP}, Allowed: ${isAllowed}`);

  if (!isAllowed) {
    console.warn(`❌ Blocked IP: ${clientIP}, Allowed IPs:`, allowedIPs);
    return res.status(403).json({ error: 'Access denied', requestIP: clientIP });
  }

  next();
};

// 简单速率限制 - 每分钟最多10次请求
const requestCounts = new Map();
const rateLimit = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1分钟
  const maxRequests = 10; // 每分钟最多10次

  if (!requestCounts.has(clientIP)) {
    requestCounts.set(clientIP, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const record = requestCounts.get(clientIP);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return next();
  }

  if (record.count >= maxRequests) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Maximum 10 requests per minute',
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    });
  }

  record.count++;
  next();
};

// 应用中间件
router.use(ipWhitelist);
router.use(rateLimit);

// Validation schema
const smartChatSchema = Joi.object({
  message: Joi.string().required().min(1).max(2000),
  sessionId: Joi.string().optional().default(() => `session_${Date.now()}`),
  userId: Joi.string().optional()
});

// Validation schema for chat with existing tasks context
const smartChatWithTasksSchema = Joi.object({
  message: Joi.string().required().min(1).max(2000),
  sessionId: Joi.string().optional().default(() => `session_${Date.now()}`),
  userId: Joi.string().optional(),
  projectName: Joi.string().optional().max(100),
  statuses: Joi.array().items(Joi.string().max(50)).optional().max(20), // Max 20 statuses
  existingTasks: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      description: Joi.string().optional().allow(''),
      status: Joi.string().required()
    })
  ).optional().max(50), // Limit to 50 tasks to avoid token overflow
  conversationHistory: Joi.array().items(
    Joi.object({
      content: Joi.string().required(),
      sender: Joi.string().valid('user', 'assistant').required()
    })
  ).optional().max(20) // Limit to last 20 messages
});

// Initialize LangChain models
const initializeChatModel = () => {
  return new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    temperature: 0.3,
    maxTokens: 200,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

const initializeTaskModel = () => {
  return new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0.4,
    maxTokens: 600,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

const initializeConversationModel = () => {
  return new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 300,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

// Define schemas for structured output
const intentSchema = z.object({
  intent: z.enum(['task_creation', 'chat']).describe('The user\'s primary intent'),
  confidence: z.number().min(0.1).max(0.9).describe('Confidence level between 0.1 and 0.9'),
  reasoning: z.string().describe('Brief explanation of the decision'),
  requiresTaskGeneration: z.boolean().describe('Whether this requires creating a task')
});

const taskSchema = z.object({
  title: z.string().describe('Clear, actionable task title'),
  description: z.string().optional().describe('Detailed task description'),
  dueDate: z.string().optional().describe('Due date in ISO format (optional)'),
  status: z.string().default('todo').describe('Task status (defaults to todo)')
  // previousStatus will be added by the system when needed, not by AI
});

// Use LangChain for intent classification with existing tasks context
const classifyIntentWithTasksContext = async (message, existingTasks = [], projectName = '', statuses = [], conversationHistory = []) => {
  try {
    console.log('🎯 Starting intent classification...');
    
    const model = initializeChatModel();
    
    // Create context sections
    const tasksContext = existingTasks.length > 0 ? 
      `\n\nExisting Tasks:\n${existingTasks.map(task => `- ${task.title} (${task.status}): ${task.description || 'No description'}`).join('\n')}` : 
      '\n\nNo existing tasks.';
    
    const projectContext = projectName ? `\n\nProject: ${projectName}` : '';
    
    // Format available statuses
    const statusesContext = statuses.length > 0 ? 
      `\n\nAvailable task statuses: ${statuses.join(', ')}` : '';

    // Format conversation history
    const historyContext = conversationHistory.length > 0 ? 
      `\n\nRecent Conversation:\n${conversationHistory.map(msg => `${msg.sender}: ${msg.content}`).join('\n')}` : 
      '\n\nNo previous conversation.';

    // Define the output structure
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        intent: z.enum(['task_creation', 'educational_question', 'chat']).describe('The classified intent'),
        confidence: z.number().min(0).max(1).describe('Confidence score'),
        requiresTaskGeneration: z.boolean().describe('Whether task generation is needed'),
        explanation: z.string().describe('Brief explanation of the classification')
      })
    );

    const formatInstructions = parser.getFormatInstructions();

    const prompt = new PromptTemplate({
      template: `You are a professional AI assistant. Analyze the user's message to determine their intent.

User Message: "{message}"
{projectContext}
{statusesContext}
{tasksContext}
{historyContext}

INTENT CLASSIFICATION:
1. "educational_question" - User wants to learn something or get instructions
   Key indicators:
   - Questions starting with "tell me how", "what are the steps", "how do I"
   - Educational questions about creating, building, or implementing something

2. "task_creation" - User wants to create a specific task or todo item
   Key indicators:
   - Describes specific work that needs to be done
   - Mentions deliverables, features, or concrete actions  
   - Uses action-oriented language like "I need to", "Create", "Build", "Implement"
   - Describes work with context and requirements
   - Explicitly asks to create/add a task
   - NOT asking "how to" but rather stating what needs to be done

3. "chat" - User wants conversation, advice, or general discussion (DEFAULT)
   Key indicators:
   - General productivity questions
   - Casual conversation
   - Status updates or progress reports
   - Non-technical questions

IMPORTANT DUPLICATION ANALYSIS:
If existing tasks are provided, carefully analyze if the user's request:
- Is EXACTLY the same as an existing task → Set requiresTaskGeneration to false, confidence to 0.3
- Is PARTIALLY covered by existing tasks → Set requiresTaskGeneration to true, confidence to 0.7
- Is COMPLETELY different from existing tasks → Normal task creation logic

Examples:
- User asks "implement login" but "Create login page" already exists → Don't create
- User asks "add user authentication" but only "Create login page UI" exists → Create the backend part
- User asks "create dashboard" and no dashboard tasks exist → Create normally

Default to "chat" unless you're confident the user wants to create a NEW, NON-DUPLICATE task.
Only use confidence above 0.6 for clear task creation requests that don't completely duplicate existing work.

{format_instructions}`,
      inputVariables: ['message', 'projectContext', 'statusesContext', 'tasksContext', 'historyContext'],
      partialVariables: { format_instructions: formatInstructions }
    });

    const formattedPrompt = await prompt.format({
      message,
      projectContext,
      statusesContext,
      tasksContext,
      historyContext
    });

    const response = await model.invoke(formattedPrompt);
    const result = await parser.parse(response.content);
    
    console.log('🎯 Intent classification result:', result);
    return result;

  } catch (error) {
    console.error('❌ Intent classification error:', error);
    // Default fallback to chat intent
    return {
      intent: 'chat',
      confidence: 0.5,
      requiresTaskGeneration: false,
      explanation: 'Failed to classify intent, defaulting to chat'
    };
  }
};


// Use LangChain to generate structured task with existing tasks context
const generateTaskWithLangChain = async (message, existingTasks = [], projectName = '', statuses = [], conversationHistory = []) => {
  try {
    const model = initializeTaskModel();
    const parser = StructuredOutputParser.fromZodSchema(taskSchema);
    const formatInstructions = parser.getFormatInstructions();

    // Format existing tasks for context
    const tasksContext = existingTasks.length > 0 ? 
      `\n\nExisting tasks in this project:\n${existingTasks.map(task => 
        `- ${task.title} (${task.status})${task.description ? ': ' + task.description : ''}`
      ).join('\n')}` : '';

    // Format project info
    const projectContext = projectName ? `\n\nProject: ${projectName}` : '';
    
    // Format available statuses - if provided, must use one of these
    const statusesContext = statuses.length > 0 ? 
      `\n\nIMPORTANT - Available task statuses (MUST use one of these): ${statuses.join(', ')}\nDefault status should be the first one: "${statuses[0]}"` : 
      '\n\nDefault status: "todo"';

    // Format conversation history
    const historyContext = conversationHistory.length > 0 ? 
      `\n\nRecent Conversation:\n${conversationHistory.map(msg => `${msg.sender}: ${msg.content}`).join('\n')}` : 
      '\n\nNo previous conversation.';

    const prompt = new PromptTemplate({
      template: `You are a professional task management assistant. Analyze the user's request and existing tasks to create a well-structured task object.

User Request: "{message}"
{projectContext}
{statusesContext}
{tasksContext}
{historyContext}

DUPLICATION ANALYSIS REQUIRED:
1. If the user's request is EXACTLY what an existing task covers:
   - DO NOT create a new task
   - Instead, create a response explaining which existing task(s) already cover this request

2. If the user's request is PARTIALLY covered by existing tasks:
   - Create a task that covers ONLY the missing/uncovered parts
   - Adjust the title and description to focus on what's NOT already done
   - Mention in description which parts are already covered by existing tasks

3. If the user's request is COMPLETELY new:
   - Create the task normally

Create a task with this structure:
- title: Clear, actionable task title focusing on what's NOT already done (required)
- description: Detailed explanation including what's already covered vs what's new (optional)
- dueDate: Due date in ISO format like "2024-12-31T23:59:59.000Z" (optional)
- status: Task status - MUST be one of the available statuses listed above (required)

CRITICAL STATUS RULES:
${statuses.length > 0 ? 
  `- Status MUST be exactly one of: ${statuses.join(', ')}
- Do NOT use any other status values
- Default to: "${statuses[0]}" if no specific status is mentioned` : 
  '- Use "todo" as default status if no statuses provided'}

Guidelines:
- Be specific about what parts are already handled by existing tasks
- Focus the new task on the gaps or additional work needed
- If everything is already covered, explain this in the description
- Return ONLY valid JSON without markdown code blocks
- Status field is MANDATORY and must match available options exactly

{format_instructions}`,
      inputVariables: ['message', 'projectContext', 'statusesContext', 'tasksContext', 'historyContext'],
      partialVariables: { format_instructions: formatInstructions }
    });

    const formattedPrompt = await prompt.format({
      message,
      projectContext,
      statusesContext,
      tasksContext,
      historyContext
    });

    const response = await model.invoke(formattedPrompt);
    
    // Clean the response content - remove markdown code blocks
    let cleanedContent = response.content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    console.log('🧹 Cleaned AI response:', cleanedContent);
    
    const task = await parser.parse(cleanedContent);
    
    // Validate status against available statuses
    if (statuses.length > 0 && !statuses.includes(task.status)) {
      console.warn(`⚠️ Invalid status "${task.status}", using "${statuses[0]}" instead`);
      task.status = statuses[0];
    }
    
    return task;

  } catch (error) {
    console.error('LangChain task generation error:', error);
    console.error('Raw AI output:', error.llmOutput);
    
    // Instead of generating a fallback task, we'll throw the error
    // to be caught by the main route handler and fallback to chat
    throw error;
  }
};

// Fallback chat response when task generation fails
const generateFallbackChatResponse = (message) => {
  return `I understand you want to create a task, but I'm having trouble generating a structured task right now. 

Based on your request: "${message}"

Here are some suggestions to help you get started:
- Break down your request into smaller, specific steps
- Define the main goal and expected outcome
- Consider what resources or tools you'll need
- Set a realistic timeline for completion

Would you like to try describing your task again with more specific details? I'm here to help!`;
};

// Use LangChain to generate conversational response with task duplication awareness
const generateChatResponseWithLangChain = async (message, existingTasks = [], projectName = '', statuses = [], conversationHistory = []) => {
  try {
    console.log('🤖 Generating chat response for:', message.substring(0, 50) + '...');
    const model = initializeConversationModel();

    // Format existing tasks for context
    const tasksContext = existingTasks.length > 0 ? 
      `\n\nExisting tasks in this project:
${existingTasks.map(task => 
  `- ${task.title} (${task.status})${task.description ? ': ' + task.description : ''}`
).join('\n')}` : '';

    // Format conversation history
    const historyContext = conversationHistory.length > 0 ? 
      `\n\nRecent Conversation History:
${conversationHistory.map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')}` : 
      '\n\nNo previous conversation.';

    console.log('📜 Conversation history context:', historyContext.substring(0, 200) + '...');

    const prompt = new PromptTemplate({
      template: `You are a helpful AI assistant for a task management application. Analyze the user's message and respond appropriately.

User Message: "{message}"
{tasksContext}
{historyContext}

IMPORTANT - USE CONVERSATION HISTORY:
- Always reference and acknowledge previous conversation when relevant
- If user asks "what did I say" or "repeat what I said" or similar memory questions, refer to the conversation history above
- If user asks about your memory, explain that you can see the recent conversation history
- Be contextually aware of the ongoing conversation flow

RESPONSE STRATEGY:

1. TECHNICAL/HOW-TO QUESTIONS:
If the user is asking technical questions, how-to instructions, or seeking guidance on implementation:
- Start with "Hey! Here's how you can approach this:"
- Provide clear, actionable step-by-step instructions
- Give specific technical advice and best practices
- Use friendly language like "First, you'll need to...", "Then you can...", "This approach works well because..."
- Include relevant examples or learning resources if applicable
- End with something like: "Learning these concepts might be helpful for you. Would you like me to create some tasks to help you practice and implement these steps?"

2. TASK-RELATED CONVERSATIONS:
If the user's message sounds like they want to create a task:
- Check existing tasks for duplicates or overlap
- If duplicates exist, point out which existing task(s) handle this
- If partially covered, explain what's already done and suggest focusing on remaining parts

3. GENERAL CONVERSATION:
For other conversations:
- Be conversational and supportive
- Focus on productivity and task management when relevant
- Keep responses concise but informative (under 200 words)
- Be encouraging and positive

IMPORTANT: For questions like "tell me, how to make a simple app?" - treat this as a TECHNICAL QUESTION that needs step-by-step guidance, NOT a task creation request.

Examples of technical questions that need direct answers with steps:
- "How to create a simple app?"
- "Tell me how to make an app"
- "What's the best way to implement authentication?"
- "How do I set up a database?"
- "How do I set up a database?"
- "What are the steps to deploy a website?"

For technical questions, provide the answer FIRST, then offer task creation help.

Respond directly with your helpful message (no JSON formatting needed).`,
      inputVariables: ['message', 'tasksContext', 'historyContext']
    });

    const formattedPrompt = await prompt.format({
      message,
      tasksContext,
      historyContext
    });

    console.log('📝 Sending prompt to OpenAI...');
    const response = await model.invoke(formattedPrompt);
    console.log('✅ OpenAI response received');
    return response.content.trim();

  } catch (error) {
    console.error('❌ LangChain chat response error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 500)
    });
    
    // Fallback response
    return 'Thank you for your message! I\'m here to help with your tasks and productivity. If you need to create a specific task, please describe what you\'d like to accomplish.';
  }
};

// Smart chat endpoint with ChatGPT integration (auto-detects existing tasks)
router.post('/', async (req, res) => {
  try {
    // Auto-detect if existingTasks are provided and validate accordingly
    const hasExistingTasks = req.body.existingTasks && Array.isArray(req.body.existingTasks);
    
    const { error, value } = hasExistingTasks 
      ? smartChatWithTasksSchema.validate(req.body)
      : smartChatSchema.validate(req.body);
      
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details[0].message 
      });
    }

    const { message, sessionId, userId, projectName, statuses = [], existingTasks = [], conversationHistory = [] } = value;

    console.log('🔍 DEBUG - AI Service received:', {
      message: message?.substring(0, 50) + '...',
      conversationHistoryLength: conversationHistory.length,
      conversationHistory: conversationHistory.slice(-2) // Show last 2 messages
    });

    // Step 1: Use LangChain to classify intent (with tasks context if available)
    const intentResult = await classifyIntentWithTasksContext(message, existingTasks, projectName, statuses, conversationHistory);

    // Step 2: Route based on AI decision
    let response = {
      sessionId,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      reasoning: intentResult.reasoning,
      timestamp: new Date().toISOString(),
      powered_by: 'LangChain + OpenAI'
    };

    if (hasExistingTasks) {
      response.tasksConsidered = existingTasks.length;
    }

    // Task creation requires higher confidence (0.6+) to avoid false positives
    // AND must not be a technical question (those should get direct answers)
    if (intentResult.requiresTaskGeneration && 
        intentResult.confidence > 0.6 && 
        intentResult.intent !== 'technical_question') {
      try {
        // Use LangChain to generate structured task (with existing tasks context if available)
        const task = await generateTaskWithLangChain(message, existingTasks, projectName, statuses, conversationHistory);
        
        response.type = 'task';
        response.task = {
          ...task,
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: task.status || 'todo',
          prev: null,
          next: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          generatedBy: hasExistingTasks ? 'smart-ai-router-langchain-with-tasks' : 'smart-ai-router-langchain',
          userId,
          originalRequest: message
        };
        
        // Generate friendly, natural message based on existing tasks
        if (hasExistingTasks && existingTasks.length > 0) {
          const completedTasks = existingTasks.filter(t => t.status === 'done');
          const inProgressTasks = existingTasks.filter(t => t.status === 'doing');
          const todoTasks = existingTasks.filter(t => t.status === 'todo');
          
          let contextMessage = '';
          if (completedTasks.length > 0) {
            contextMessage += ` I notice you've already completed ${completedTasks.map(t => `"${t.title}"`).join(' and ')}, which is great progress!`;
          }
          if (inProgressTasks.length > 0) {
            contextMessage += ` You currently have ${inProgressTasks.map(t => `"${t.title}"`).join(' and ')} in progress.`;
          }
          if (todoTasks.length > 0) {
            contextMessage += ` You also have ${todoTasks.map(t => `"${t.title}"`).join(' and ')} planned, which will be helpful for this.`;
          }
          
          response.message = `Hey! To help you with this, I've created a task: "${task.title}".${contextMessage}`;
        } else {
          response.message = `Hey! I've created a task to help you: "${task.title}".`;
        }
        
      } catch (taskError) {
        console.log('Task generation failed, falling back to chat:', taskError.message);
        
        // Fallback to chat if task generation fails
        response.type = 'chat';
        response.reply = await generateChatResponseWithLangChain(
          `I understand you want to create a task: "${message}". Let me help you break it down into actionable steps.`, 
          existingTasks,
          projectName,
          statuses,
          conversationHistory
        );
        response.fallback = true;
        response.fallbackReason = 'Task generation failed';
      }
      
    } else {
      // Handle different intent types
      if (intentResult.intent === 'technical_question') {
        // For technical questions, provide direct answers with AI chat
        response.type = 'technical_answer';
        response.reply = await generateChatResponseWithLangChain(message, existingTasks, projectName, statuses, conversationHistory);
        response.note = "Technical guidance provided. Would you like me to create tasks to help you implement these steps?";
      } else {
        // Default to chat - Use LangChain to generate conversational response
        response.type = 'chat';
        response.reply = await generateChatResponseWithLangChain(message, existingTasks, projectName, statuses, conversationHistory);
        
        // Add note for low confidence scenarios
        if (intentResult.confidence < 0.5) {
          response.note = "If you'd like to create a specific task, please describe the work you need to accomplish in more detail.";
        }
      }
    }

    res.json(response);

  } catch (error) {
    console.error('Smart chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      message: error.message,
      type: 'error'
    });
  }
});

// Debug intent endpoint with existing tasks context
router.post('/debug-intent', async (req, res) => {
  try {
    const { message, existingTasks = [], projectName = '', statuses = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get intent classification from LangChain with tasks context (if provided)
    const intentResult = await classifyIntentWithTasksContext(message, existingTasks, projectName, statuses);

    res.json({
      message,
      projectName,
      statusesCount: statuses.length,
      statuses,
      existingTasksCount: existingTasks.length,
      existingTasks: existingTasks.map(task => ({
        title: task.title,
        status: task.status,
        description: task.description || 'No description'
      })),
      intent: intentResult,
      note: 'Intent classified using LangChain + OpenAI' + (existingTasks.length > 0 ? ' with existing tasks context' : ''),
      powered_by: 'LangChain + OpenAI GPT'
    });

  } catch (error) {
    console.error('Intent debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 调试端点：查看请求IP
router.get('/debug/ip', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  res.json({
    yourIP: clientIP,
    note: 'Add this IP to your .env file if needed'
  });
});

// 测试OpenAI API连接
router.get('/test-openai', async (req, res) => {
  try {
    console.log('🧪 Testing OpenAI API connection...');
    
    const model = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.1,
      maxTokens: 50,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const response = await model.invoke('Say "Hello, OpenAI API is working!"');
    
    res.json({
      success: true,
      response: response.content,
      message: 'OpenAI API is working correctly!'
    });

  } catch (error) {
    console.error('❌ OpenAI API test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

module.exports = router;
