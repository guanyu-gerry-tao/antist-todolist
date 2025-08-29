const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { ChatOpenAI } = require('@langchain/openai');
const { StructuredOutputParser } = require('@langchain/core/output_parsers');
const { PromptTemplate } = require('@langchain/core/prompts');
const { z } = require('zod');
const { SYSTEM_PROMPTS, MODEL_CONFIGS } = require('../config/prompts');

// Validation schema
const smartChatSchema = Joi.object({
  message: Joi.string().required().min(1).max(2000),
  sessionId: Joi.string().optional().default(() => `session_${Date.now()}`),
  userId: Joi.string().optional(),
  context: Joi.string().optional().max(1000)
});

// Intent classification schema
const intentSchema = z.object({
  intent: z.enum(['chat', 'task_creation', 'task_modification', 'project_planning']).describe('The user\'s primary intent'),
  confidence: z.number().min(0).max(1).describe('Confidence level of the intent classification'),
  reasoning: z.string().describe('Brief explanation of why this intent was chosen'),
  requiresTaskGeneration: z.boolean().describe('Whether this request requires generating a structured task'),
  extractedTaskInfo: z.object({
    description: z.string().optional().describe('Task description if task creation is needed'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('Suggested priority level'),
    category: z.string().optional().describe('Suggested task category'),
    estimatedDuration: z.string().optional().describe('Estimated time to complete')
  }).optional().describe('Extracted task information if applicable')
});

// Initialize models
const initializeIntentModel = () => {
  return new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    temperature: 0.1, // Low temperature for consistent intent classification
    maxTokens: 500,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

const initializeChatModel = () => {
  return new ChatOpenAI({
    modelName: MODEL_CONFIGS.CHAT.modelName,
    temperature: MODEL_CONFIGS.CHAT.temperature,
    maxTokens: MODEL_CONFIGS.CHAT.maxTokens,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

const initializeTaskModel = () => {
  return new ChatOpenAI({
    modelName: MODEL_CONFIGS.TASK_GENERATION.modelName,
    temperature: MODEL_CONFIGS.TASK_GENERATION.temperature,
    maxTokens: MODEL_CONFIGS.TASK_GENERATION.maxTokens,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

// Create intent classifier
const createIntentClassifier = () => {
  const parser = StructuredOutputParser.fromZodSchema(intentSchema);
  const formatInstructions = parser.getFormatInstructions();

  const prompt = new PromptTemplate({
    template: `You are an intelligent intent classifier for a task management application. 
    
Your job is to analyze user messages and determine their primary intent.

Intent Categories:
1. "chat" - General conversation, questions about productivity, asking for advice, casual chat
2. "task_creation" - User wants to create a new task, mentions something they need to do
3. "task_modification" - User wants to edit, update, or change existing tasks
4. "project_planning" - User wants to plan a project, break down complex work, create multiple related tasks

Key Indicators for Task Creation:
- "I need to...", "I have to...", "I should..."
- "Create a...", "Build a...", "Implement..."
- "Task:", "TODO:", "Action item:"
- Mentions specific deliverables or deadlines
- Describes work that needs to be done

Key Indicators for Chat:
- Questions about how to use the app
- Asking for advice or suggestions
- General productivity questions
- "How do I...", "What's the best way to..."
- Casual conversation

Examples:
- "I need to create a login page for our website" → task_creation
- "How do I organize my tasks better?" → chat  
- "I should finish the project documentation by Friday" → task_creation
- "What's a good way to prioritize tasks?" → chat
- "Can you help me plan a new mobile app project?" → project_planning

User Message: {message}
Context: {context}

Analyze this message and classify the intent.

{format_instructions}`,
    inputVariables: ['message', 'context'],
    partialVariables: { format_instructions: formatInstructions }
  });

  return { model: initializeIntentModel(), prompt, parser };
};

// Task generation schema for smart routing
const taskSchema = z.object({
  title: z.string().describe('A clear, concise title for the task'),
  description: z.string().describe('Detailed description of what needs to be done'),
  priority: z.enum(['low', 'medium', 'high']).describe('Task priority level'),
  estimatedDuration: z.string().describe('Estimated time to complete'),
  category: z.string().describe('Task category'),
  tags: z.array(z.string()).describe('Relevant tags for the task'),
  subtasks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    estimatedDuration: z.string()
  })).optional().describe('Optional subtasks'),
  acceptanceCriteria: z.array(z.string()).describe('Clear criteria for completion')
});

// Generate task from intent
const generateTaskFromIntent = async (intentResult, originalMessage, context) => {
  const taskModel = initializeTaskModel();
  const parser = StructuredOutputParser.fromZodSchema(taskSchema);
  const formatInstructions = parser.getFormatInstructions();

  const prompt = new PromptTemplate({
    template: `Based on the user's intent to create a task, generate a well-structured task.

User's Message: {message}
Context: {context}
Extracted Info: {extractedInfo}

Create a comprehensive task that addresses the user's request.

{format_instructions}`,
    inputVariables: ['message', 'context', 'extractedInfo'],
    partialVariables: { format_instructions: formatInstructions }
  });

  const formattedPrompt = await prompt.format({
    message: originalMessage,
    context: context || '',
    extractedInfo: JSON.stringify(intentResult.extractedTaskInfo || {})
  });

  const response = await taskModel.invoke([{ role: 'user', content: formattedPrompt }]);
  return await parser.parse(response.content);
};

// Generate chat response
const generateChatResponse = async (message, context, sessionId) => {
  const chatModel = initializeChatModel();
  
  // TODO: Add memory management here (Redis or in-memory)
  // For now, just use the message and context
  
  const systemPrompt = `${SYSTEM_PROMPTS.TASK_ASSISTANT}

Current Context: ${context || 'No additional context provided'}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message }
  ];

  const response = await chatModel.invoke(messages);
  return response.content;
};

// Smart chat endpoint
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error, value } = smartChatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details[0].message 
      });
    }

    const { message, sessionId, userId, context } = value;

    // Step 1: Classify user intent
    const { model: intentModel, prompt: intentPrompt, parser: intentParser } = createIntentClassifier();
    
    const formattedIntentPrompt = await intentPrompt.format({
      message,
      context: context || ''
    });

    const intentResponse = await intentModel.invoke([
      { role: 'user', content: formattedIntentPrompt }
    ]);

    const intentResult = await intentParser.parse(intentResponse.content);

    // Step 2: Route based on intent
    let response = {
      sessionId,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      reasoning: intentResult.reasoning,
      timestamp: new Date().toISOString()
    };

    if (intentResult.requiresTaskGeneration && intentResult.confidence > 0.7) {
      // Generate structured task
      try {
        const task = await generateTaskFromIntent(intentResult, message, context);
        
        response.type = 'task';
        response.task = {
          ...task,
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'todo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          generatedBy: 'smart-ai-router',
          userId,
          originalRequest: message
        };
        response.message = `I've created a task for you based on your request. The task "${task.title}" has been generated with detailed steps and acceptance criteria.`;
        
      } catch (taskError) {
        console.error('Task generation failed, falling back to chat:', taskError);
        // Fallback to chat if task generation fails
        response.type = 'chat';
        response.reply = await generateChatResponse(message, context, sessionId);
        response.fallbackReason = 'Task generation failed, provided chat response instead';
      }
    } else {
      // Generate conversational response
      response.type = 'chat';
      response.reply = await generateChatResponse(message, context, sessionId);
      
      // If confidence is low, mention the uncertainty
      if (intentResult.confidence < 0.5) {
        response.note = "I'm not entirely sure what you're looking for. Feel free to be more specific if you need help with creating tasks!";
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

// Debug endpoint to test intent classification only
router.post('/debug-intent', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const { model: intentModel, prompt: intentPrompt, parser: intentParser } = createIntentClassifier();
    
    const formattedPrompt = await intentPrompt.format({
      message,
      context: context || ''
    });

    const intentResponse = await intentModel.invoke([
      { role: 'user', content: formattedPrompt }
    ]);

    const intentResult = await intentParser.parse(intentResponse.content);

    res.json({
      message,
      context,
      intent: intentResult,
      rawResponse: intentResponse.content
    });

  } catch (error) {
    console.error('Intent debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
