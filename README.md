# 🤖 Agent Builder Platform

A powerful workflow automation platform with real OAuth integrations for Zoho CRM, Google Workspace, Slack, and Stripe. Build intelligent workflows that execute real actions via secure API connections.

## ✨ Features

- **🔄 Workflow Automation**: Build multi-step workflows with triggers, conditions, and actions
- **🔗 Real Integrations**: OAuth-powered connections to Zoho CRM, Google Workspace, Slack, Stripe
- **📋 Task Management**: Auto-generated follow-up tasks with due dates and priority levels
- **📊 Real-time Execution**: Watch workflows execute step-by-step with live progress tracking
- **🎨 Modern UI**: Beautiful dark-themed interface with gradient accents
- **🔐 Secure OAuth**: All tokens stored server-side, never exposed to frontend
- **📧 Template Library**: Pre-built workflows for client onboarding, invoice reminders, lead qualification, and more

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- TailwindCSS for styling
- React Router for navigation
- Lucide React for icons

### Backend
- Node.js with Express
- PostgreSQL (Neon serverless)
- RESTful API architecture
- OAuth 2.0 token management
- Workflow execution engine

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (or Neon account)
- OAuth credentials for integrations (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/kevin21quirk/agentbuilder.git
cd agentbuilder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your database URL:
```env
DATABASE_URL=postgresql://user:password@host/database
```

4. (Optional) Add OAuth credentials for integrations:
```env
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
```

See `INTEGRATION_SETUP.md` for detailed OAuth setup instructions.

### Running the Application

#### Development Mode (Recommended)
Run both frontend and backend concurrently:
```bash
npm run dev
```

This will start:
- Backend API server on `http://localhost:3001`
- Frontend dev server on `http://localhost:5173`

#### Separate Servers
Run backend only:
```bash
npm run server
```

Run frontend only (in a separate terminal):
```bash
npm run client
```

### Building for Production

Build the frontend:
```bash
npm run build
```

The built files will be in `client/dist/`

## Project Structure

```
Agent Builder/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Agents.tsx
│   │   │   ├── Tasks.tsx
│   │   │   └── Workflows.tsx
│   │   ├── App.tsx        # Main app component
│   │   ├── main.tsx       # Entry point
│   │   └── index.css      # Global styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── server/                # Backend Express API
│   └── index.js          # API server
├── package.json          # Root package.json
└── README.md
```

## API Endpoints

### Agents
- `GET /api/agents` - Get all agents
- `POST /api/agents` - Create new agent
- `GET /api/agents/:id` - Get agent by ID
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `POST /api/tasks/:id/execute` - Execute task

### Workflows
- `GET /api/workflows` - Get all workflows
- `POST /api/workflows` - Create new workflow
- `POST /api/workflows/:id/execute` - Execute workflow

### Stats
- `GET /api/stats` - Get platform statistics

## Usage Guide

### 1. Create an Agent
1. Navigate to the Agents page
2. Click "Create Agent"
3. Enter agent name, description, and capabilities
4. Click "Create"

### 2. Create a Task
1. Navigate to the Tasks page
2. Click "Create Task"
3. Fill in task details:
   - Title and description
   - Select an agent
   - Set priority (low/medium/high)
   - Add execution steps (optional)
4. Click "Create"

### 3. Execute a Task
1. Find your task in the Tasks list
2. Click the "Execute" button
3. Watch the task status change from pending → running → completed

### 4. Create a Workflow
1. Navigate to the Workflows page
2. Click "Create Workflow"
3. Enter workflow details:
   - Name and description
   - Trigger type (manual/scheduled/event-based)
   - List of tasks (one per line)
4. Click "Create"

### 5. Execute a Workflow
1. Find your workflow in the Workflows list
2. Click the "Execute" button
3. The workflow will process all tasks in sequence

## Customization

### Adding Database Support
The current implementation uses in-memory storage. To add database support:

1. Install your preferred database driver (e.g., `mongodb`, `pg`, `mysql2`)
2. Update `server/index.js` to connect to your database
3. Replace array storage with database queries

### Extending Agent Capabilities
Modify the agent creation logic in `server/index.js` to add:
- Custom agent types
- Integration with AI APIs (OpenAI, Anthropic, etc.)
- Advanced scheduling
- Real-time notifications

### Adding Authentication
To add user authentication:
1. Install `jsonwebtoken` and `bcrypt`
2. Add user registration/login endpoints
3. Implement JWT middleware
4. Protect routes with authentication

## Contributing

This is a starter template. Feel free to extend it with:
- Database integration
- User authentication
- Real AI agent integration
- Advanced workflow features
- Scheduling capabilities
- Notifications system

## License

MIT License - feel free to use this project for any purpose.

## Support

For issues or questions, please create an issue in the repository.
