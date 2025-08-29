# Task Management Web Client

A modern React-based web application for productivity and task management, built with TypeScript and Vite. Features a responsive interface, real-time updates, and seamless integration with backend services.

## Features

### User Interface
- [x] Modern React 19 with functional components and hooks
- [x] TypeScript for type safety and enhanced developer experience
- [x] Responsive design with CSS modules and custom styling
- [x] Drag-and-drop task management interface
- [x] Real-time updates and state management
- [x] Multi-project support with dynamic switching

### Core Functionality
- [x] User authentication and session management
- [x] Task creation, editing, and status tracking
- [x] Project organization and management
- [x] Interactive chat interface with service integration
- [x] Data persistence with backend API integration
- [ ] Offline-capable design patterns

### Development Tools
- [x] Vite for fast development and optimized builds
- [x] Hot module replacement for rapid iteration
- [x] ESLint for code quality and consistency
- [x] TypeScript strict mode configuration
- [x] Modern ES modules and build optimization

## Technology Stack

- **Frontend Framework**: React 19 with functional components
- **Type System**: TypeScript with strict configuration
- **Build Tool**: Vite with optimized bundling
- **Styling**: CSS modules with custom properties
- **State Management**: React Context API and custom hooks
- **HTTP Client**: Fetch API with custom abstractions
- **Code Quality**: ESLint with React and TypeScript rules
- **Development**: Hot reload and fast refresh

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Backend services running (server and ai-service)

### Installation
1. Navigate to the web client directory:
   ```bash
   cd web-client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

5. Preview production build:
   ```bash
   npm run preview
   ```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Create optimized production build
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality checks

## Project Structure

```
web-client/
├── src/
│   ├── components/          # React components
│   │   ├── AIChatPanel.tsx  # Chat interface component
│   │   ├── TodoList.tsx     # Task management interface
│   │   ├── Login.tsx        # Authentication component
│   │   └── ...
│   ├── data/                # Data management and types
│   ├── utils/               # Utility functions and helpers
│   ├── assets/              # Static assets and icons
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
├── public/                  # Public assets
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── eslint.config.js         # ESLint configuration
```

### Features
- [x] JavaScript/TypeScript recommended rules
- [x] React Hooks best practices enforcement
- [x] React Refresh integration for development
- [x] Modern ECMAScript support
- [x] Browser environment configuration

## API Integration

### Backend Services
The application integrates with multiple backend services:

#### Main Server (Port 3001)
- User authentication and session management
- Task and project CRUD operations
- Data persistence and retrieval

#### AI Service (Port 3002)
- Intelligent chat functionality
- Task generation from natural language
- Conversation context management

### Example API Usage
```typescript
// Task operations
const createTask = async (taskData: TaskInput) => {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData)
  });
  return response.json();
};

// Chat integration
const sendChatMessage = async (message: string, history: Message[]) => {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationHistory: history })
  });
  return response.json();
};
```

## Key Components

### AIChatPanel
- Real-time chat interface with backend AI service
- Conversation history management
- Task generation integration
- Context-aware responses

### TodoList & Task Management
- Drag-and-drop task reordering
- Status-based task organization
- Real-time updates across sessions
- Project-based task filtering

### Authentication
- Secure login with JWT tokens
- Session persistence and management
- Protected route handling
- Demo user support for testing

## Development Workflow

### Hot Reload Development
- Instant component updates without losing state
- TypeScript error reporting in real-time
- CSS changes applied immediately
- Fast feedback loop for rapid development

### Build Optimization
- Code splitting for optimal loading
- Tree shaking for minimal bundle size
- Asset optimization and compression
- Source map generation for debugging

## Performance Considerations

### Optimization Strategies
- Lazy loading for route-based components
- Memoization of expensive calculations
- Efficient re-rendering with React.memo
- Optimized state updates and context usage

### Bundle Analysis
- Production builds optimized for size
- Dynamic imports for code splitting
- Asset compression and caching
- Modern JavaScript for supported browsers

## Browser Support

- Modern browsers with ES2020 support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile responsive design
- Progressive enhancement approach

This web client serves as the primary user interface for the task management system, demonstrating modern React development practices, TypeScript integration, and responsive design principles.
