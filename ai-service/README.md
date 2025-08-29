# Task Management Service

A Node.js microservice that provides intelligent task processing and conversation capabilities for productivity applications. Built with modern web technologies including Express.js, LangChain integration, and RESTful API design.

## Features

### Chat Service
- [ ] Multi-session conversation management
- [x] Context-aware response generation
- [x] Session isolation and memory management
- [ ] Configurable conversation window
- [ ] Automatic cleanup of inactive sessions

### Task Processing
- [x] Natural language to structured JSON conversion
- [x] Automatic task decomposition
- [x] Priority and time estimation
- [ ] Category and tag classification
- [x] Acceptance criteria generation

### System Management
- [x] RESTful API architecture
- [x] Input validation and sanitization
- [x] Error handling and logging
- [x] Health monitoring endpoints
- [x] Rate limiting and security measures

## API Endpoints

### System Health
```http
GET /health
```
Returns service status and uptime information.

### Conversation Management
```http
POST /api/chat
Content-Type: application/json

{
  "message": "User message content",
  "sessionId": "optional_session_identifier",
  "userId": "optional_user_identifier"
}
```

### Task Generation
```http
POST /api/tasks/generate
Content-Type: application/json

{
  "description": "Task description in natural language",
  "context": "Additional project context",
  "priority": "low|medium|high",
  "projectId": "optional_project_identifier"
}
```

### Batch Task Processing
```http
POST /api/tasks/generate-batch
Content-Type: application/json

{
  "descriptions": ["Task 1 description", "Task 2 description"],
  "context": "Project context",
  "priority": "medium",
  "projectId": "project_id"
}
```

### Session Management
```http
DELETE /api/chat/memory/:sessionId
GET /api/chat/history/:sessionId
```

## Installation and Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- OpenAI API key

### Environment Configuration
1. Clone the repository and navigate to the service directory:
   ```bash
   cd ai-service
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3002
   NODE_ENV=development
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   MAX_MEMORY_MESSAGES=10
   ```

### Running the Service

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The service will be available at `http://localhost:3002`

## Response Format

### Task Generation Response
```json
{
  "success": true,
  "task": {
    "id": "task_1693123456789_abc123def",
    "title": "Task Title",
    "description": "Detailed task description",
    "priority": "medium",
    "estimatedDuration": "2 hours",
    "category": "development",
    "tags": ["frontend", "react", "ui"],
    "subtasks": [
      {
        "title": "Subtask Title",
        "description": "Subtask description",
        "estimatedDuration": "30 minutes"
      }
    ],
    "dependencies": [],
    "acceptanceCriteria": [
      "Completion criteria 1",
      "Completion criteria 2"
    ],
    "projectId": "project123",
    "status": "todo",
    "createdAt": "2023-08-27T10:30:45.123Z",
    "updatedAt": "2023-08-27T10:30:45.123Z",
    "generatedBy": "ai-service"
  }
}
```

## Architecture

### Technology Stack
- **Runtime**: Node.js with Express.js framework
- **Natural Language Processing**: LangChain integration
- **External APIs**: OpenAI GPT models
- **Security**: Helmet.js, CORS, rate limiting
- **Development**: Nodemon for hot reloading
- **Logging**: Morgan for request logging

### Project Structure
```
ai-service/
├── config/
│   └── prompts.js          # System prompts and model configuration
├── middleware/
│   └── rateLimiter.js      # IP-based rate limiting
├── routes/
│   ├── aiChat.js           # Chat conversation endpoints
│   ├── smartChat.js        # Advanced chat features
│   ├── smartChatSimple.js  # Simplified chat interface
│   └── taskGenerator.js    # Task generation endpoints
├── utils/
│   └── helpers.js          # Utility functions
├── index.js                # Main server entry point
└── package.json            # Dependencies and scripts
```

## Configuration

### System Prompts
The service uses configurable system prompts in `config/prompts.js`:
- **TASK_ASSISTANT**: Defines conversation behavior and response style
- **TASK_GENERATOR**: Guidelines for task decomposition and structure
- **PROJECT_ANALYZER**: Project analysis and context understanding

### Model Parameters
Adjustable model configuration:
- Temperature settings for creativity vs consistency balance
- Maximum token limits for response length
- Model selection (GPT-3.5-turbo vs GPT-4)

### Memory Management
- **MAX_MEMORY_MESSAGES**: Number of messages retained per session
- Automatic cleanup of inactive sessions
- Configurable session timeout duration

## Integration

### Main Application Integration
Add proxy configuration in your main server to route requests:

```javascript
// Express.js proxy setup
const { createProxyMiddleware } = require('http-proxy-middleware');

app.use('/api/ai', createProxyMiddleware({
  target: 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: {
    '^/api/ai': ''
  }
}));
```

### Frontend Integration
Example API client implementation:

```javascript
// Chat functionality
const chatWithService = async (message, sessionId) => {
  const response = await fetch('/api/ai/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId })
  });
  return response.json();
};

// Task generation
const generateTask = async (description, context, priority) => {
  const response = await fetch('/api/ai/api/tasks/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, context, priority })
  });
  return response.json();
};
```

## Development

### Extending Functionality
1. Create new route files in the `routes/` directory
2. Add corresponding system prompts in `config/prompts.js`
3. Register new routes in the main `index.js` file

### Testing
The service includes basic testing capabilities:
- Health check endpoint for service monitoring
- Rate limiting test scripts
- Error handling validation

### Code Quality
- Input validation and sanitization
- Comprehensive error handling
- Structured logging with Morgan
- Security headers with Helmet.js

## Security Features

- [x] Environment-based API key management
- [x] CORS configuration for origin restrictions
- [x] IP-based rate limiting (30 requests/hour, unlimited for localhost)
- [x] Input validation and sanitization
- [x] Request logging and monitoring
- [x] Error handling without information leakage

## Production Considerations

### Recommended Enhancements
- **Database Integration**: Redis for session management, PostgreSQL/MongoDB for persistence
- **Monitoring**: Structured logging with Winston, performance monitoring
- **Error Tracking**: Integration with Sentry or similar services
- **Load Balancing**: Multiple service instances behind a load balancer
- **Authentication**: JWT-based authentication middleware
- **Caching**: Response caching for frequently requested data

### Performance Optimization
- Connection pooling for external API calls
- Response compression
- Request/response caching
- Background job processing for heavy operations

## License

This project is part of a personal portfolio and is available for review and demonstration purposes.
