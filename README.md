# Task Management System

A full-stack productivity application with intelligent task processing capabilities. Built with modern web technologies including React, Node.js, and microservice architecture.

## 🚀 Live Demo

### **[🌐 Access the Application](https://raccoon-study-todolist.vercel.app/)**

**Demo Credentials:**
- **Email:** demouser001@raccoon.com  
- **Password:** password

*Experience the full-featured task management system with AI-powered conversation capabilities!*

## Overview

This application demonstrates a complete task management solution featuring user authentication, real-time task operations, and intelligent conversation capabilities. The system is designed with a microservice architecture for scalability and maintainability.

### Key Features

#### Task Management
- [x] Complete CRUD operations for tasks and projects
- [x] Drag-and-drop interface with status-based organization
- [x] Multi-project support with dynamic switching
- [x] Real-time updates and state synchronization
- [x] Task prioritization and deadline management

#### User Experience
- [x] Secure authentication with JWT tokens
- [x] Responsive design for desktop and mobile
- [x] Interactive chat interface for task assistance
- [x] Demo user access for easy testing
- [x] Persistent user sessions and preferences

#### Intelligent Features
- [x] Natural language task generation
- [x] Conversation history and context awareness
- [x] Automated task decomposition and suggestions
- [x] Context-aware response generation


## Architecture

### System Design
The application follows a microservice architecture with clear separation of concerns:

- **Web Client**: React-based frontend with TypeScript
- **Main Server**: Express.js API server for core operations
- **Task Service**: Specialized microservice for intelligent task processing
- **Database**: MongoDB for data persistence
- **Authentication**: JWT-based secure authentication system

### Technology Stack

#### Frontend
- **React 19** - Modern functional components with hooks
- **TypeScript** - Type safety and enhanced developer experience
- **Vite** - Fast development server and optimized builds
- **CSS Modules** - Scoped styling with custom properties

#### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB** - Document database for flexible data modeling
- **JWT + Bcrypt** - Secure authentication and password hashing

#### Development Tools
- **ESLint** - Code quality and consistency
- **Nodemon** - Development server auto-restart
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security middleware

#### External Services
- **OpenAI API** - Natural language processing capabilities
- **LangChain** - Conversation management and context handling

## Project Structure

```
raccoon-study-todolist/
├── web-client/              # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── data/           # Data management and types
│   │   ├── utils/          # Utility functions
│   │   └── assets/         # Static assets
│   ├── vite.config.ts      # Vite configuration
│   └── package.json        # Frontend dependencies
├── server/                  # Main Express.js API server
│   ├── controllers/        # Request handlers
│   ├── database/           # Database models and initialization
│   ├── middlewares/        # Custom middleware
│   ├── routes/             # API route definitions
│   └── package.json        # Backend dependencies
├── ai-service/             # Intelligent task processing service
│   ├── config/             # Service configuration
│   ├── middleware/         # Rate limiting and security
│   ├── routes/             # Service endpoints
│   ├── utils/              # Helper functions
│   └── package.json        # Service dependencies
├── test/                   # Testing environment
└── docs/                   # Project documentation
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- MongoDB (local or cloud instance)
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/guanyu-gerry-tao/raccoon-study-todolist.git
   cd raccoon-study-todolist
   ```

2. **Install dependencies for all services**
   ```bash
   # Main server
   cd server && npm install
   
   # AI service
   cd ../ai-service && npm install
   
   # Web client
   cd ../web-client && npm install
   ```

3. **Configure environment variables**
   ```bash
   # In server/ directory
   cp .env.example .env
   # Add your MongoDB connection string and JWT secret
   
   # In ai-service/ directory
   cp .env.example .env
   # Add your OpenAI API key
   ```

4. **Initialize the database**
   ```bash
   cd server/database
   node initMongoDB.js
   ```

5. **Start all services**
   ```bash
   # Terminal 1: Main server (port 3001)
   cd server && npm run dev
   
   # Terminal 2: AI service (port 3002)
   cd ai-service && npm run dev
   
   # Terminal 3: Web client (port 5173)
   cd web-client && npm run dev
   ```

### Demo Access
- **URL**: http://localhost:5173
- **Demo Email**: demouser001@raccoon.com
- **Demo Password**: password

The login form comes pre-filled with demo credentials for easy testing.

## API Documentation

### Main Server Endpoints (Port 3001)
- `POST /api/auth/login` - User authentication
- `GET /api/auth/me` - Get current user profile
- `GET /api/tasks` - Retrieve user tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update existing task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/projects` - Get user projects
- `POST /api/projects` - Create new project

### AI Service Endpoints (Port 3002)
- `GET /health` - Service health check
- `POST /api/smart/chat` - Intelligent conversation
- `POST /api/tasks/generate` - Generate tasks from natural language
- `GET /admin/rate-limit/stats` - Rate limiting statistics

## Key Features Demonstration

### Intelligent Task Generation
```javascript
// Example: Natural language to structured tasks
Input: "I want to learn full-stack development"

Output: [
  {
    title: "Learn HTML fundamentals",
    description: "Master HTML structure and semantic elements",
    priority: "medium",
    estimatedDuration: "1 week"
  },
  {
    title: "Master CSS and responsive design", 
    description: "Learn CSS Grid, Flexbox, and mobile-first design",
    priority: "medium",
    estimatedDuration: "2 weeks"
  }
  // Additional tasks...
]
```

### Conversation Memory
The system maintains conversation context across chat sessions, allowing for:
- Contextual follow-up questions
- Reference to previous task discussions
- Personalized recommendations based on history

### Security Features
- [x] JWT-based authentication with secure token handling
- [x] Password hashing with bcrypt
- [x] IP-based rate limiting (30 requests/hour, unlimited for localhost)
- [x] CORS configuration for secure cross-origin requests
- [x] Input validation and sanitization

## Development Status

### Completed Features
- [x] Full-stack application architecture
- [x] User authentication and session management
- [x] Complete task CRUD operations
- [x] Project organization and management
- [x] Intelligent chat interface with conversation memory
- [x] Natural language task generation
- [x] Responsive web interface
- [x] Database integration with demo data
- [x] Rate limiting and security measures
- [x] Demo user setup for testing

### Architecture Highlights
- [x] Microservice design pattern
- [x] RESTful API design
- [x] Component-based frontend architecture
- [x] Type-safe development with TypeScript
- [x] Modern build tooling with Vite
- [x] Code quality enforcement with ESLint

## Technical Decisions

### Database Choice
- **MongoDB** selected for flexible document structure and rapid prototyping
- Schema-less design accommodates evolving task properties
- Easy horizontal scaling for future growth

### Microservice Architecture
- **Separation of concerns** with dedicated AI service
- **Independent deployment** and scaling capabilities
- **Technology diversity** - different services can use optimal tools

### Frontend Approach
- **React 19** with functional components for modern development
- **TypeScript** for type safety and better maintainability
- **Component composition** for reusable UI elements

## Performance Considerations

- **Code splitting** for optimized bundle loading
- **Lazy loading** for non-critical components
- **Memoization** strategies for expensive calculations
- **Rate limiting** to prevent API abuse
- **Connection pooling** for database efficiency

## Testing Strategy

The project includes comprehensive testing capabilities:
- **Component testing** environment in `/test` directory
- **API endpoint testing** with health checks
- **Rate limiting validation** with automated scripts
- **Integration testing** across services

## Deployment Considerations

### Production Readiness
- Environment-based configuration management
- Secure API key handling
- Error logging and monitoring hooks
- Graceful shutdown handling
- Health check endpoints for monitoring

### Scalability Features
- Stateless service design for horizontal scaling
- Database indexing for query optimization
- Caching strategies for frequently accessed data
- Load balancing preparation

## Contributing

This project demonstrates modern full-stack development practices and is available for review and collaboration. The codebase follows industry best practices for:

- **Code Organization**: Clear separation of concerns and modular design
- **Type Safety**: Comprehensive TypeScript usage
- **Security**: Multiple layers of protection and validation
- **Performance**: Optimized for both development and production
- **Maintainability**: Clean code principles and documentation

## Contact

This project is part of a professional portfolio demonstrating full-stack development capabilities. For questions, collaboration opportunities, or technical discussions, please feel free to reach out through GitHub.
