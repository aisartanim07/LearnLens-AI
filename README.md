# LearnLens AI — Capstone Full Stack AI Web Application

LearnLens AI is a full-stack AI-powered study companion designed to help students organize their learning. Users can manage study tasks, save notes, and generate simplified study guides using a locally running AI model.

## Features

- **User Authentication:** Secure signup and login using password hashing and JWT authentication.
- **Dashboard:** View task totals, completed tasks, and saved notes.
- **Task Management:** Add tasks and mark them as completed.
- **Notes Management:** Create, view, and delete study notes.
- **AI Study Assistant:** Generate simplified explanations, key points, and practice questions.
- **User Data Isolation:** Each user can access only their own tasks and notes.
- **Responsive Interface:** Designed for desktop and mobile screens.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, CSS |
| Backend | Node.js, Express.js |
| Database | SQLite |
| Authentication | bcryptjs, JSON Web Tokens (JWT) |
| AI Integration | Ollama, Qwen 2.5 3B |
| API Communication | REST API |

## Architecture

LearnLens AI follows a client-server architecture. The React frontend provides the user interface for authentication, task management, notes, and AI study tools. It communicates with the backend through REST API requests.

The backend is built using Node.js and Express.js. It handles user registration, login, authentication, and the application's task and note operations. Passwords are hashed using bcryptjs, while JWT tokens are used to authenticate protected API requests.

SQLite stores user accounts, tasks, and notes. Each task and note is associated with its owner, allowing the backend to isolate data between users.

For AI study guide generation, the backend communicates with Ollama, which runs the Qwen 2.5 3B language model locally. The generated study guide is returned to the frontend and displayed using Markdown rendering.

The application separates the frontend, backend, database, and AI integration into distinct components, making the system easier to maintain and extend.

## Project Structure

```text
learnlens-ai/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── api.js
│   └── package.json
├── backend/
│   ├── server.js
│   ├── learnlens.db
│   └── package.json
├── README.md
└── ARCHITECTURE.md
```

## Local Setup

### Prerequisites

- Node.js and npm
- Ollama
- Qwen 2.5 3B model

### 1. Clone the repository

```bash
git clone https://github.com/aisartanim07/LearnLens-AI.git
cd learnlens-ai
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder:

```env
JWT_SECRET=replace_with_a_long_random_secret
```

Start the backend:

```bash
node server.js
```

The backend runs at:

```text
http://localhost:5001
```

### 3. Set up the AI model

Install Ollama and download the model:

```bash
ollama pull qwen2.5:3b
```

Make sure Ollama is running locally.

### 4. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173
```

## Security Notes

- Passwords are stored as hashes rather than plain text.
- Protected API routes require JWT authentication.
- Task and note operations are restricted to the authenticated user.
- Keep `.env` and secret values out of public repositories.

## Future Improvements

- Add a study timetable and reminders.
- Add progress charts and learning analytics.
- Support additional AI models.
- Deploy the application for public access.

## Author

Developed as a full-stack AI web application capstone project.
