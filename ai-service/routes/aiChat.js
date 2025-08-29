const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { ChatOpenAI } = require('@langchain/openai');
const { ConversationChain } = require('langchain/chains');
const { BufferWindowMemory } = require('langchain/memory');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');

// Memory storage for conversations (in production, use Redis or database)
const conversationMemories = new Map();

// Validation schema
const chatSchema = Joi.object({
  message: Joi.string().required().min(1).max(1000),
  sessionId: Joi.string().optional().default('default'),
  userId: Joi.string().optional()
});

// Initialize OpenAI model
const initializeModel = () => {
  return new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

// Get or create conversation memory
const getConversationMemory = (sessionId) => {
  if (!conversationMemories.has(sessionId)) {
    const memory = new BufferWindowMemory({
      k: parseInt(process.env.MAX_MEMORY_MESSAGES) || 10,
      returnMessages: true,
      memoryKey: 'chat_history'
    });
    conversationMemories.set(sessionId, memory);
  }
  return conversationMemories.get(sessionId);
};

// Create conversation chain with custom prompt
const createConversationChain = (memory) => {
  const model = initializeModel();
  
  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are a helpful AI assistant for a task management application. 
      
      Your role is to:
      1. Help users manage their tasks and projects
      2. Provide productivity advice and suggestions
      3. Answer questions about task organization
      4. Be conversational and helpful
      
      Guidelines:
      - Keep responses concise but helpful
      - Focus on task management and productivity topics
      - Be encouraging and positive
      - If users ask about creating tasks, guide them to use the task generator endpoint
      
      Remember the conversation context to provide personalized assistance.`
    ],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}']
  ]);

  return new ConversationChain({
    llm: model,
    memory: memory,
    prompt: prompt,
    verbose: false
  });
};

// Chat endpoint
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error, value } = chatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details[0].message 
      });
    }

    const { message, sessionId, userId } = value;

    // Get conversation memory
    const memory = getConversationMemory(sessionId);
    
    // Create conversation chain
    const chain = createConversationChain(memory);

    // Generate AI response
    const response = await chain.call({
      input: message
    });

    res.json({
      reply: response.response,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI response',
      message: error.message 
    });
  }
});

// Clear conversation memory endpoint
router.delete('/memory/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (conversationMemories.has(sessionId)) {
    conversationMemories.delete(sessionId);
    res.json({ message: 'Conversation memory cleared', sessionId });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// Get conversation history endpoint
router.get('/history/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    const memory = conversationMemories.get(sessionId);
    if (!memory) {
      return res.json({ history: [], sessionId });
    }

    const history = await memory.chatHistory.getMessages();
    res.json({
      history: history.map(msg => ({
        type: msg._getType(),
        content: msg.content,
        timestamp: msg.additional_kwargs?.timestamp || new Date().toISOString()
      })),
      sessionId
    });
  } catch (error) {
    console.error('Get History Error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
});

module.exports = router;
