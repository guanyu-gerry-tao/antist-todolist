const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { ChatOpenAI } = require('@langchain/openai');
const { StructuredOutputParser, OutputFixingParser } = require('@langchain/core/output_parsers');
const { PromptTemplate } = require('@langchain/core/prompts');
const { z } = require('zod');

// Validation schema for task generation request
const taskGenerationSchema = Joi.object({
  description: Joi.string().required().min(5).max(500),
  context: Joi.string().optional().max(1000),
  projectId: Joi.string().optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional().default('medium'),
  userId: Joi.string().optional()
});

// Zod schema for task structure validation
const taskSchema = z.object({
  title: z.string().describe('A clear, concise title for the task'),
  description: z.string().describe('Detailed description of what needs to be done'),
  priority: z.enum(['low', 'medium', 'high']).describe('Task priority level'),
  estimatedDuration: z.string().describe('Estimated time to complete (e.g., "2 hours", "1 day")'),
  category: z.string().describe('Task category (e.g., "development", "design", "research")'),
  tags: z.array(z.string()).describe('Relevant tags for the task'),
  subtasks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    estimatedDuration: z.string()
  })).optional().describe('Optional subtasks to break down the main task'),
  dependencies: z.array(z.string()).optional().describe('Tasks that must be completed before this one'),
  acceptanceCriteria: z.array(z.string()).describe('Clear criteria for task completion')
});

// Initialize the structured output parser
const parser = StructuredOutputParser.fromZodSchema(taskSchema);

// Create the prompt template for task generation
const createTaskPrompt = () => {
  const formatInstructions = parser.getFormatInstructions();
  
  return new PromptTemplate({
    template: `You are an expert project manager and task breakdown specialist. 
    
Your job is to analyze the user's task description and create a well-structured, actionable task with all necessary details.

Guidelines:
1. Create clear, specific, and actionable task titles
2. Provide detailed descriptions that leave no ambiguity
3. Break down complex tasks into manageable subtasks when appropriate
4. Estimate realistic time durations
5. Suggest relevant tags and categories
6. Define clear acceptance criteria for completion
7. Consider dependencies if the context suggests other tasks are related

User's Task Description: {description}

Additional Context: {context}

Priority Level: {priority}

Please analyze this request and generate a comprehensive task structure that follows best practices for project management.

{format_instructions}`,
    inputVariables: ['description', 'context', 'priority'],
    partialVariables: { format_instructions: formatInstructions }
  });
};

// Initialize OpenAI model for task generation
const initializeTaskModel = () => {
  return new ChatOpenAI({
    modelName: 'gpt-4',  // Using GPT-4 for better structured output
    temperature: 0.3,    // Lower temperature for more consistent output
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

// Generate task endpoint
router.post('/generate', async (req, res) => {
  try {
    // Validate input
    const { error, value } = taskGenerationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details[0].message 
      });
    }

    const { description, context = '', priority, projectId, userId } = value;

    // Initialize model and prompt
    const model = initializeTaskModel();
    const prompt = createTaskPrompt();

    // Create output fixing parser to handle potential JSON issues
    const outputFixingParser = OutputFixingParser.fromLLM(model, parser);

    // Format the prompt
    const formattedPrompt = await prompt.format({
      description,
      context,
      priority
    });

    // Generate task structure
    const response = await model.call([{ role: 'user', content: formattedPrompt }]);
    
    // Parse the structured output
    const parsedTask = await outputFixingParser.parse(response.content);

    // Add metadata
    const taskWithMetadata = {
      ...parsedTask,
      id: generateTaskId(),
      projectId,
      userId,
      status: 'todo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generatedBy: 'ai-service'
    };

    res.json({
      success: true,
      task: taskWithMetadata,
      originalRequest: {
        description,
        context,
        priority
      }
    });

  } catch (error) {
    console.error('Task Generation Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate task',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Generate multiple related tasks
router.post('/generate-batch', async (req, res) => {
  const batchSchema = Joi.object({
    descriptions: Joi.array().items(Joi.string().min(5).max(500)).required().min(1).max(5),
    context: Joi.string().optional().max(1000),
    projectId: Joi.string().optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional().default('medium')
  });

  try {
    const { error, value } = batchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details[0].message 
      });
    }

    const { descriptions, context = '', priority, projectId } = value;
    const tasks = [];

    // Generate tasks sequentially to avoid rate limits
    for (const description of descriptions) {
      try {
        const model = initializeTaskModel();
        const prompt = createTaskPrompt();
        const outputFixingParser = OutputFixingParser.fromLLM(model, parser);

        const formattedPrompt = await prompt.format({
          description,
          context,
          priority
        });

        const response = await model.call([{ role: 'user', content: formattedPrompt }]);
        const parsedTask = await outputFixingParser.parse(response.content);

        const taskWithMetadata = {
          ...parsedTask,
          id: generateTaskId(),
          projectId,
          status: 'todo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          generatedBy: 'ai-service'
        };

        tasks.push(taskWithMetadata);
      } catch (taskError) {
        console.error(`Error generating task for: ${description}`, taskError);
        // Continue with other tasks even if one fails
        tasks.push({
          error: true,
          originalDescription: description,
          message: 'Failed to generate this task'
        });
      }
    }

    res.json({
      success: true,
      tasks,
      totalRequested: descriptions.length,
      totalGenerated: tasks.filter(t => !t.error).length
    });

  } catch (error) {
    console.error('Batch Task Generation Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate batch tasks',
      message: error.message
    });
  }
});

// Utility function to generate unique task IDs
function generateTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Validate task structure endpoint (for testing)
router.post('/validate', (req, res) => {
  try {
    const validatedTask = taskSchema.parse(req.body);
    res.json({ 
      valid: true, 
      task: validatedTask 
    });
  } catch (error) {
    res.status(400).json({ 
      valid: false, 
      errors: error.errors 
    });
  }
});

module.exports = router;
