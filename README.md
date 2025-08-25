# Raccoon Study

Raccoon Study App is an AI-driven study todolist.

# key feature:
## AI assistant to manage

Key feature is AI understand users' prompt like following:

> "I want to study front-end tech-stack"

Then AI make a list of tasks like following on user's interface:

> - [ ] learn HTML - 7 days
> - [ ] learn CSS - 4 days
> - [ ] learn Javascript - 14 days
> - [ ] learn React.js - 14 days

- use AI to understand user's need
- AI return 3~5 tasks with properties, add to todolist
- AI monitor user's progress, prompt alert if user slack

User can also manually add/edit/delete tasks.

## Original Todolist

- add, edit, check, delete tasks
- tasks include properties: 
  - check box
  - title
  - starting date
  - ending date
  - detail (or resources)
- multiple projects (categories)

## Auth

- create user account with email and pw
- create user account with phone number and pw (TBD)
- OAuth (TBD)
- 2-step (TBD)

## iOS / MacOS client

TBD


# Project Goals

- Implement secure user authentication (JWT)
- Build a user-friendly task interface with full CRUD
- Store tasks per user in a PostgreSQL database
- Structure the project with separate frontend and backend
- Prepare for production deployment and multi-platform expansion


# Tech Stack

- Frontend
  - React
  - React Router
  - TypeScript
  - Vite
- Backend
  - Node.js 
  - Express
- Database
  - PostgreSQL
- ORM
  - Prisma
- Auth
  - JWT + Bcrypt
- Deployment
  - Vercel (frontend)
  - Render (backend + DB)
- AI
  - OpenAI or Deepseek API
  - Prompt Enginering

# Folder Structure

```
antist-todolist/
├── client/      # React frontend
├── server/      # Express backend
├── prisma/      # Prisma schema and migrations
├── docs/        # Optional project docs
└── README.md    # This file
```

# Development Scope

## Phase 1: MVP
- [ ] Front-end and back-end set up
- [ ] Create / Delete / Toggle tasks (basic function)
- [ ] Display tasks per user
- [ ] Edit task content

## Phase 2: In Progress
- [ ] AI
- [ ] Responsive layout & style polish
- [ ] Global state management (e.g., Zustand)

## Phase 3: Optional/Future
- [ ] SwiftUI iOS/macOS client
- [ ] Multi-device sync
- [ ] OAuth login (Google/GitHub)

---

Open to collaboration. Feel free to contact or submit issues if you'd like to join!
