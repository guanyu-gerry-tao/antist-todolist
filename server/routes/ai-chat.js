const express = require('express');
const router = express.Router();
const Conversation = require('../database/models/conversations');
const Message = require('../database/models/messages');
const Project = require('../database/models/projects');
const Status = require('../database/models/statuses');
const Task = require('../database/models/tasks');
const UserProfile = require('../database/models/userProfiles');
const authMW = require('../middlewares/authMiddleware');

// AI Microservice configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3002';
const AI_SERVICE_ENDPOINT = `${AI_SERVICE_URL}/api/smart`;

router.post('/', authMW, async (req, res) => {
  const { message, conversationHistory = [] } = req.body;

  console.log('🔍 DEBUG - Received request body:', {
    message: message?.substring(0, 50) + '...',
    conversationHistoryLength: conversationHistory.length,
    conversationHistory: conversationHistory.slice(-3) // Show last 3 messages for debugging
  });

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Get userId from authenticated user (from JWT token)
  const userId = req.user.userId; // JWT token stores userId, not id

  try {
    console.log('🔄 Processing AI chat request...');
    console.log('📝 Message:', message.substring(0, 50) + '...');
    console.log('� Debug - req.user:', req.user);
    console.log('�👤 User ID (from auth):', userId);

    if (!userId) {
      console.error('❌ No userId in JWT token:', req.user);
      return res.status(401).json({ 
        error: 'Invalid authentication',
        message: 'User ID not found in authentication token.'
      });
    }

    // Get user profile to find current/last project
    const userProfile = await UserProfile.findOne({ userAuthId: userId });
    if (!userProfile) {
      console.warn('⚠️ User profile not found for userId:', userId);
      return res.status(404).json({ 
        error: 'User profile not found',
        message: 'User profile not found. Please complete your profile setup.'
      });
    }

    console.log('👤 User profile found:', userProfile.nickname);

    let projectName = '';
    let statuses = ['todo', 'doing', 'done']; // Default statuses
    let existingTasks = [];
    let currentProjectId = userProfile.lastProjectId;

    // If user has a current/last project, get project data
    if (currentProjectId) {
      try {
        console.log('📂 Getting data for current project:', currentProjectId);

        // 1. Get current project information
        const currentProject = await Project.findOne({ id: currentProjectId, userId });
        if (!currentProject) {
          console.warn('⚠️ Current project not found or access denied:', currentProjectId);
          // Don't return error, just continue without project context
          currentProjectId = null;
        } else {
          projectName = currentProject.title;
          console.log('📂 Current project:', projectName);

          // 2. Get statuses for current project
          const projectStatuses = await Status.find({ 
            project: currentProjectId, 
            userId 
          }).sort({ createdAt: 1 });

          if (projectStatuses.length > 0) {
            statuses = projectStatuses.map(status => status.title);
            console.log('📊 Project statuses:', statuses);
          } else {
            console.log('📊 No custom statuses found, using defaults');
          }

          // 3. Get all tasks for current project
          const statusIds = projectStatuses.map(status => status.id);
          
          if (statusIds.length > 0) {
            console.log('🔍 Debug - statusIds:', statusIds);
            
            // Query tasks without populate first
            const projectTasks = await Task.find({
              status: { $in: statusIds },
              userId
            }).sort({ createdAt: 1 });

            console.log('🔍 Debug - found tasks:', projectTasks.length);

            // Create a status lookup map for efficiency
            const statusMap = new Map(projectStatuses.map(s => [s.id, s.title]));

            existingTasks = projectTasks.map(task => ({
              title: task.title,
              description: task.description || '',
              status: statusMap.get(task.status) || 'unknown'
            }));
            
            console.log('📋 Found tasks in current project:', existingTasks.length);
          } else {
            console.log('📋 No tasks found (no statuses defined)');
          }
        }

      } catch (projectError) {
        console.error('❌ Error getting project data:', projectError);
        // Continue without project context instead of failing
        console.log('🔄 Continuing without project context...');
        currentProjectId = null;
        projectName = '';
      }
    } else {
      console.log('📂 No current project set for user');
    }

    // Prepare payload for AI microservice
    const aiServicePayload = {
      message,
      sessionId: `session_${Date.now()}_${userId}`,
      userId,
      projectName,
      statuses,
      existingTasks,
      conversationHistory
    };

    console.log('🚀 Sending to AI microservice:', {
      hasProject: !!projectName,
      projectName,
      statusesCount: statuses.length,
      tasksCount: existingTasks.length,
      conversationHistoryLength: conversationHistory.length
    });

    // Call AI microservice using built-in fetch
    const aiResponse = await fetch(AI_SERVICE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TodoList-Main-Server/1.0'
      },
      body: JSON.stringify(aiServicePayload),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('🚫 AI service error details:', {
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        body: errorText
      });
      throw new Error(`AI service responded with status: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();

    console.log('✅ AI microservice response received');
    console.log('📋 Response type:', aiData.type);
    console.log('🎯 Intent:', aiData.intent);
    console.log('📊 Confidence:', aiData.confidence);

    // Process the AI response based on type
    let processedResponse = {
      reply: '',
      type: aiData.type,
      intent: aiData.intent,
      confidence: aiData.confidence,
      microservice_response: true
    };

    switch (aiData.type) {
      case 'task':
        // Task was generated
        processedResponse.reply = aiData.message || `Task created: "${aiData.task.title}"`;
        processedResponse.task = aiData.task;
        processedResponse.note = 'A new task has been generated for you';
        break;
        
      case 'technical_answer':
        // Technical question answered
        processedResponse.reply = aiData.reply;
        processedResponse.note = aiData.note || 'Technical guidance provided';
        break;
        
      case 'chat':
      default:
        // Regular conversation
        processedResponse.reply = aiData.reply;
        if (aiData.note) {
          processedResponse.note = aiData.note;
        }
        break;
    }

    // Add additional metadata if available
    if (aiData.reasoning) {
      processedResponse.reasoning = aiData.reasoning;
    }

    if (aiData.fallback) {
      processedResponse.fallback = true;
      processedResponse.fallbackReason = aiData.fallbackReason;
    }

    res.json(processedResponse);

  } catch (error) {
    console.error('❌ Error calling AI microservice:', error);
    
    // Handle different types of errors
    if (error.name === 'AbortError') {
      console.error('⏰ Request timeout');
      return res.status(504).json({ 
        error: 'Request timeout', 
        message: 'AI service took too long to respond. Please try again.',
        service_status: 'timeout'
      });
    }
    
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
      console.error('🔌 AI microservice is not running');
      return res.status(503).json({ 
        error: 'AI service unavailable', 
        message: 'The AI microservice is currently unavailable. Please try again later.',
        service_status: 'offline'
      });
    }
    
    if (error.message.includes('status:')) {
      // AI microservice returned an error response
      const statusMatch = error.message.match(/status: (\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 500;
      console.error('🚫 AI microservice error response:', status);
      return res.status(status).json({
        error: 'AI service error',
        message: 'AI service encountered an error',
        service_status: `error_${status}`
      });
    }
    
    if (error.cause && error.cause.code === 'ENOTFOUND') {
      console.error('🌐 Network error - cannot reach AI microservice');
      return res.status(503).json({ 
        error: 'Network error', 
        message: 'Cannot reach AI service. Please check network connection.',
        service_status: 'unreachable'
      });
    }

    // Generic error fallback
    console.error('❓ Unknown error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate AI reply',
      message: 'An unexpected error occurred while processing your request.',
      fallback: true
    });
  }
});

// Helper endpoint to get user's projects for AI chat context
router.get('/projects', authMW, async (req, res) => {
  try {
    const userId = req.user.userId; // Get userId from authenticated user
    
    console.log('📂 Fetching projects for user:', userId);

    const projects = await Project.find({ userId }).sort({ createdAt: 1 });
    
    const projectsWithTaskCounts = await Promise.all(projects.map(async (project) => {
      // Get statuses for this project
      const statuses = await Status.find({ project: project.id, userId });
      const statusIds = statuses.map(s => s.id);
      
      // Count tasks in this project
      const taskCount = statusIds.length > 0 ? 
        await Task.countDocuments({ status: { $in: statusIds }, userId }) : 0;
      
      return {
        id: project.id,
        title: project.title,
        description: project.description,
        taskCount,
        statusCount: statuses.length,
        createdAt: project.createdAt
      };
    }));

    // Also get user's current project info
    const userProfile = await UserProfile.findOne({ userAuthId: userId });
    const currentProjectId = userProfile?.lastProjectId || null;

    res.json({
      projects: projectsWithTaskCounts,
      totalProjects: projects.length,
      currentProjectId: currentProjectId,
      currentProject: currentProjectId ? 
        projectsWithTaskCounts.find(p => p.id === currentProjectId) : null
    });

  } catch (error) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({ 
      error: 'Failed to fetch projects',
      message: error.message 
    });
  }
});

// Helper endpoint to switch current project
router.post('/switch-project', authMW, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Verify user owns this project
    const project = await Project.findOne({ id: projectId, userId });
    if (!project) {
      return res.status(404).json({ 
        error: 'Project not found',
        message: 'Project not found or you do not have access to it.'
      });
    }

    // Update user's lastProjectId
    await UserProfile.updateOne(
      { userAuthId: userId },
      { lastProjectId: projectId }
    );

    console.log(`📂 User ${userId} switched to project: ${project.title}`);

    res.json({
      success: true,
      message: `Switched to project: ${project.title}`,
      currentProjectId: projectId,
      projectName: project.title
    });

  } catch (error) {
    console.error('Error switching project:', error);
    res.status(500).json({ 
      error: 'Failed to switch project',
      message: error.message 
    });
  }
});

module.exports = router;