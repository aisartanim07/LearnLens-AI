const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;
const OLLAMA_URL = "http://localhost:11434";
const OLLAMA_MODEL = "qwen2.5:3b";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET in backend/.env");
  process.exit(1);
}

// ---------------- DATABASE ----------------

const db = new Database("learnlens.db");

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT ''
  );
`);

// Add user_id to existing tables if it does not exist.
// Existing records remain in the database but are not assigned to new users.

const taskColumns = db.prepare("PRAGMA table_info(tasks)").all();
if (!taskColumns.some((column) => column.name === "user_id")) {
  db.exec("ALTER TABLE tasks ADD COLUMN user_id INTEGER REFERENCES users(id)");
}

const noteColumns = db.prepare("PRAGMA table_info(notes)").all();
if (!noteColumns.some((column) => column.name === "user_id")) {
  db.exec("ALTER TABLE notes ADD COLUMN user_id INTEGER REFERENCES users(id)");
}

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ---------------- AUTHENTICATION HELPERS ----------------

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Please log in to access this resource.",
    });
  }

  const token = authorization.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = db
      .prepare("SELECT id, name, email FROM users WHERE id = ?")
      .get(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found. Please log in again.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Your login session is invalid or expired.",
    });
  }
}

// ---------------- HEALTH CHECK ----------------

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the LearnLens AI backend!",
    status: "Server is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "LearnLens AI API is working",
  });
});

// ---------------- REGISTER ----------------

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: "Name, email, and password are required.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address.",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long.",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const result = db
      .prepare(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)"
      )
      .run(name.trim(), normalizedEmail, passwordHash);

    const user = {
      id: result.lastInsertRowid,
      name: name.trim(),
      email: normalizedEmail,
    };

    const token = createToken(user);

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user,
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not create your account.",
    });
  }
});

// ---------------- LOGIN ----------------

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const userRecord = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(normalizedEmail);

  if (!userRecord) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
  }

  const passwordMatches = await bcrypt.compare(
    password,
    userRecord.password_hash
  );

  if (!passwordMatches) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
  }

  const user = {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
  };

  const token = createToken(user);

  res.json({
    success: true,
    message: "Login successful.",
    token,
    user,
  });
});

// ---------------- CURRENT USER ----------------

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// ---------------- AI STUDY ASSISTANT ----------------

app.post("/api/study-guide", requireAuth, async (req, res) => {
  const { topic } = req.body;

  if (typeof topic !== "string" || !topic.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please enter a study topic.",
    });
  }

  if (topic.trim().length > 200) {
    return res.status(400).json({
      success: false,
      message: "Please keep the topic under 200 characters.",
    });
  }

  const prompt = `
You are LearnLens AI, a friendly study assistant for beginner students.

Create a study guide about: ${topic.trim()}

Use simple and clear English.

Follow this exact structure:

SIMPLE EXPLANATION:
Explain the topic in a beginner-friendly paragraph.

KEY POINTS:
- Give 3 important points.

PRACTICE QUESTIONS:
1. Give a question.
2. Give a question.
3. Give a question.

Keep the response educational, accurate, and easy to understand.
`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      topic: topic.trim(),
      guide: data.response,
      model: OLLAMA_MODEL,
    });
  } catch (error) {
    console.error("Study Assistant error:", error.message);

    res.status(503).json({
      success: false,
      message: "Could not connect to Ollama. Please make sure Ollama is running.",
    });
  }
});

// ---------------- TASK ROUTES ----------------

// Get tasks belonging to the logged-in user
app.get("/api/tasks", requireAuth, (req, res) => {
  const tasks = db
    .prepare(
      "SELECT id, title, completed FROM tasks WHERE user_id = ? ORDER BY id DESC"
    )
    .all(req.user.id)
    .map((task) => ({
      ...task,
      completed: Boolean(task.completed),
    }));

  res.json(tasks);
});

// Create a task for the logged-in user
app.post("/api/tasks", requireAuth, (req, res) => {
  const { title } = req.body;

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: "Task title is required.",
    });
  }

  const result = db
    .prepare("INSERT INTO tasks (title, user_id) VALUES (?, ?)")
    .run(title.trim(), req.user.id);

  const newTask = db
    .prepare("SELECT id, title, completed FROM tasks WHERE id = ? AND user_id = ?")
    .get(result.lastInsertRowid, req.user.id);

  res.status(201).json({
    ...newTask,
    completed: Boolean(newTask.completed),
  });
});

// Update task completion
app.patch("/api/tasks/:id", requireAuth, (req, res) => {
  const taskId = Number(req.params.id);
  const { completed } = req.body;

  if (!Number.isInteger(taskId) || typeof completed !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "A valid task ID and completion status are required.",
    });
  }

  const result = db
    .prepare(
      "UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?"
    )
    .run(completed ? 1 : 0, taskId, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({
      success: false,
      message: "Task not found.",
    });
  }

  const updatedTask = db
    .prepare("SELECT id, title, completed FROM tasks WHERE id = ? AND user_id = ?")
    .get(taskId, req.user.id);

  res.json({
    ...updatedTask,
    completed: Boolean(updatedTask.completed),
  });
});

// Delete a task
app.delete("/api/tasks/:id", requireAuth, (req, res) => {
  const taskId = Number(req.params.id);

  if (!Number.isInteger(taskId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid task ID.",
    });
  }

  const result = db
    .prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?")
    .run(taskId, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({
      success: false,
      message: "Task not found.",
    });
  }

  res.json({
    success: true,
    message: "Task deleted.",
  });
});

// ---------------- NOTE ROUTES ----------------

// Get notes belonging to the logged-in user
app.get("/api/notes", requireAuth, (req, res) => {
  const notes = db
    .prepare(
      "SELECT id, title, content FROM notes WHERE user_id = ? ORDER BY id DESC"
    )
    .all(req.user.id);

  res.json(notes);
});

// Create a note for the logged-in user
app.post("/api/notes", requireAuth, (req, res) => {
  const { title, content } = req.body;

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: "Note title is required.",
    });
  }

  const noteContent = typeof content === "string" ? content.trim() : "";

  const result = db
    .prepare(
      "INSERT INTO notes (title, content, user_id) VALUES (?, ?, ?)"
    )
    .run(title.trim(), noteContent, req.user.id);

  const newNote = db
    .prepare(
      "SELECT id, title, content FROM notes WHERE id = ? AND user_id = ?"
    )
    .get(result.lastInsertRowid, req.user.id);

  res.status(201).json(newNote);
});

// Delete a note
app.delete("/api/notes/:id", requireAuth, (req, res) => {
  const noteId = Number(req.params.id);

  if (!Number.isInteger(noteId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid note ID.",
    });
  }

  const result = db
    .prepare("DELETE FROM notes WHERE id = ? AND user_id = ?")
    .run(noteId, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({
      success: false,
      message: "Note not found.",
    });
  }

  res.json({
    success: true,
    message: "Note deleted.",
  });
});

// ---------------- START SERVER ----------------

app.listen(PORT, () => {
  console.log(`LearnLens AI backend running at http://localhost:${PORT}`);
});