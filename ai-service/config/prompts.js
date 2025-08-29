// Prompt templates for different use cases
const SYSTEM_PROMPTS = {
  TASK_ASSISTANT: `You are a helpful AI assistant for a task management application. 
  
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

Remember the conversation context to provide personalized assistance.`,

  TASK_GENERATOR: `You are an expert project manager and task breakdown specialist.

Your job is to analyze the user's task description and create a well-structured, actionable task with all necessary details.

Guidelines:
1. Create clear, specific, and actionable task titles
2. Provide detailed descriptions that leave no ambiguity
3. Break down complex tasks into manageable subtasks when appropriate
4. Estimate realistic time durations
5. Suggest relevant tags and categories
6. Define clear acceptance criteria for completion
7. Consider dependencies if the context suggests other tasks are related`,

  PROJECT_ANALYZER: `You are a project analysis expert. Help users understand their project structure and suggest improvements for better task organization.`,

  INTENT_CLASSIFIER: `You are an intelligent intent classifier for a task management application.

Your job is to analyze user messages and determine whether they want to:
1. Have a conversation (chat)
2. Create a new task (task_creation)  
3. Modify existing tasks (task_modification)
4. Plan a project (project_planning)

Key indicators for task creation:
- Action-oriented language: "I need to", "I have to", "I should"
- Specific deliverables: "Create a", "Build a", "Implement"
- Work descriptions with context and requirements
- Mentions of deadlines or time constraints

Key indicators for conversation:
- Questions about productivity or app usage
- Requests for advice or suggestions  
- General inquiries without specific action items
- "How do I", "What's the best way", "Can you help me understand"

Analyze the user's true intent, not just keywords.`
};

// Model configurations
const MODEL_CONFIGS = {
  CHAT: {
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000
  },
  TASK_GENERATION: {
    modelName: 'gpt-4',
    temperature: 0.3,
    maxTokens: 2000
  },
  ANALYSIS: {
    modelName: 'gpt-3.5-turbo',
    temperature: 0.5,
    maxTokens: 1500
  }
};

// Memory configurations
const MEMORY_CONFIG = {
  DEFAULT_WINDOW_SIZE: 10,
  MAX_WINDOW_SIZE: 20,
  CLEANUP_INTERVAL: 1000 * 60 * 30 // 30 minutes
};

// Task categories and their descriptions
const TASK_CATEGORIES = {
  'development': 'Programming, coding, and technical implementation tasks',
  'design': 'UI/UX design, graphics, and visual creation tasks',
  'research': 'Information gathering, analysis, and investigation tasks',
  'planning': 'Project planning, strategy, and organizational tasks',
  'testing': 'Quality assurance, testing, and validation tasks',
  'documentation': 'Writing documentation, guides, and explanations',
  'meeting': 'Meetings, calls, and collaborative discussions',
  'maintenance': 'Bug fixes, updates, and system maintenance',
  'learning': 'Education, training, and skill development',
  'communication': 'Emails, updates, and stakeholder communication'
};

// Priority levels and their criteria
const PRIORITY_CRITERIA = {
  'high': 'Urgent tasks that block other work or have immediate deadlines',
  'medium': 'Important tasks that should be completed soon but are not blocking',
  'low': 'Nice-to-have tasks that can be done when time permits'
};

module.exports = {
  SYSTEM_PROMPTS,
  MODEL_CONFIGS,
  MEMORY_CONFIG,
  TASK_CATEGORIES,
  PRIORITY_CRITERIA
};
