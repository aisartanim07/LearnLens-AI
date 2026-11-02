import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  checkBackend,
  registerUser,
  loginUser,
  getCurrentUser,
  getTasks,
  createTask,
  updateTask,
  getNotes,
  createNote,
  deleteNote,
  generateStudyGuide,
} from "./api";
import "./App.css";

function App() {
  const [screen, setScreen] = useState("signup");
  const [view, setView] = useState("dashboard");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [userName, setUserName] = useState("");
  const [authError, setAuthError] = useState("");
  const [backendStatus, setBackendStatus] = useState("Checking backend...");
  const [dataError, setDataError] = useState("");

  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);

  const [newTask, setNewTask] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  const [studyTopic, setStudyTopic] = useState("");
  const [studyGuide, setStudyGuide] = useState("");
  const [studyError, setStudyError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const completedTasks = tasks.filter((task) => task.completed).length;

  useEffect(() => {
    async function verifySession() {
      const token = localStorage.getItem("learnlensToken");

      if (!token) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const result = await getCurrentUser();
        setUserName(result.user.name);
        setIsLoggedIn(true);
      } catch {
        localStorage.removeItem("learnlensToken");
        localStorage.removeItem("learnlensUserName");
        setIsLoggedIn(false);
      } finally {
        setIsCheckingSession(false);
      }
    }

    verifySession();
  }, []);

  useEffect(() => {
    checkBackend()
      .then((data) => setBackendStatus(data.message))
      .catch(() => setBackendStatus("Backend connection failed"));
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    async function loadData() {
      try {
        setDataError("");

        const [taskData, noteData] = await Promise.all([
          getTasks(),
          getNotes(),
        ]);

        setTasks(taskData);
        setNotes(noteData);
      } catch (error) {
        setDataError(
          error.message || "Could not load your tasks and notes."
        );
      }
    }

    loadData();
  }, [isLoggedIn]);

  async function handleAuth(event) {
    event.preventDefault();
    setAuthError("");
    setIsAuthenticating(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();

    try {
      let result;

      if (screen === "signup") {
        const name = formData.get("name")?.toString().trim();

        if (!name || !email || !password) {
          setAuthError("Please complete all required fields.");
          return;
        }

        result = await registerUser(name, email, password);
      } else {
        if (!email || !password) {
          setAuthError("Please enter your email and password.");
          return;
        }

        result = await loginUser(email, password);
      }

      localStorage.setItem("learnlensToken", result.token);
      localStorage.setItem("learnlensUserName", result.user.name);

      setUserName(result.user.name);
      setIsLoggedIn(true);
      setView("dashboard");
      setTasks([]);
      setNotes([]);
    } catch (error) {
      setAuthError(error.message || "Authentication failed.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  function logout() {
    localStorage.removeItem("learnlensToken");
    localStorage.removeItem("learnlensUserName");

    setIsLoggedIn(false);
    setIsCheckingSession(false);
    setUserName("");
    setTasks([]);
    setNotes([]);
    setStudyGuide("");
    setStudyError("");
    setDataError("");
    setAuthError("");
    setScreen("login");
    setView("dashboard");
  }

  async function addTask(event) {
    event.preventDefault();

    if (!newTask.trim()) {
      setDataError("Please enter a task title.");
      return;
    }

    try {
      setDataError("");
      const savedTask = await createTask(newTask.trim());

      setTasks((current) => [savedTask, ...current]);
      setNewTask("");
    } catch (error) {
      setDataError(error.message || "Could not save the task.");
    }
  }

  async function toggleTask(taskId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    try {
      setDataError("");

      const updatedTask = await updateTask(
        taskId,
        !task.completed
      );

      setTasks((current) =>
        current.map((item) =>
          item.id === taskId ? updatedTask : item
        )
      );
    } catch (error) {
      setDataError(error.message || "Could not update the task.");
    }
  }

  async function addNote(event) {
    event.preventDefault();

    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      setDataError("Please enter a note title and content.");
      return;
    }

    try {
      setDataError("");

      const savedNote = await createNote(
        newNoteTitle.trim(),
        newNoteContent.trim()
      );

      setNotes((current) => [savedNote, ...current]);
      setNewNoteTitle("");
      setNewNoteContent("");
    } catch (error) {
      setDataError(error.message || "Could not save the note.");
    }
  }

  async function handleDeleteNote(noteId) {
    try {
      setDataError("");
      await deleteNote(noteId);

      setNotes((current) =>
        current.filter((note) => note.id !== noteId)
      );
    } catch (error) {
      setDataError(error.message || "Could not delete the note.");
    }
  }

  async function handleGenerateStudyGuide(event) {
    event.preventDefault();

    if (!studyTopic.trim()) {
      setStudyError("Please enter a study topic.");
      return;
    }

    try {
      setIsGenerating(true);
      setStudyError("");
      setStudyGuide("");

      const result = await generateStudyGuide(studyTopic.trim());
      setStudyGuide(result.guide);
    } catch (error) {
      setStudyError(
        error.message ||
          "Could not generate the study guide. Please check Ollama."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  if (isCheckingSession) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>LearnLens AI</h1>
          <p className="auth-subtitle">
            Verifying your login session...
          </p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="auth-page">
        <div className="auth-brand">
          <div className="brand-icon">L</div>
          <span>LearnLens AI</span>
        </div>

        <div className="auth-card">
          <div className="auth-icon">✦</div>

          <h1>
            {screen === "signup"
              ? "Create your account"
              : "Welcome back"}
          </h1>

          <p className="auth-subtitle">
            {screen === "signup"
              ? "Start your smarter learning journey."
              : "Continue your learning journey."}
          </p>

          <form className="auth-form" onSubmit={handleAuth}>
            {screen === "signup" && (
              <label>
                Full name
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  minLength="2"
                  maxLength="80"
                  required
                />
              </label>
            )}

            <label>
              Email address
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                autoComplete={
                  screen === "signup"
                    ? "new-password"
                    : "current-password"
                }
                minLength="8"
                required
              />
            </label>

            {authError && (
              <p className="backend-status" role="alert">
                {authError}
              </p>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={isAuthenticating}
            >
              {isAuthenticating
                ? "Please wait..."
                : screen === "signup"
                  ? "Create account"
                  : "Log in"}
            </button>
          </form>

          <div className="auth-switch">
            {screen === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthError("");
                    setScreen("login");
                  }}
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                Don’t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthError("");
                    setScreen("signup");
                  }}
                >
                  Sign up
                </button>
              </>
            )}
          </div>

          <p className="auth-demo-note">
            Your account is secured using password hashing and
            authenticated API access.
          </p>
        </div>

        <p className="auth-footer">
          LearnLens AI · Learn smarter, not harder
        </p>
      </div>
    );
  }

  function renderTasks() {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">STAY ON TRACK</p>
            <h2>My Tasks</h2>
          </div>
          <span className="panel-count">{tasks.length} tasks</span>
        </div>

        <form className="add-form" onSubmit={addTask}>
          <input
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            placeholder="Add a new study task..."
            maxLength="200"
            required
          />
          <button type="submit">+ Add</button>
        </form>

        <div className="task-list">
          {tasks.map((task) => (
            <label className="task-item" key={task.id}>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id)}
              />
              <span className={task.completed ? "task-done" : ""}>
                {task.title}
              </span>
            </label>
          ))}

          {tasks.length === 0 && (
            <p className="auth-demo-note">
              No tasks yet. Add your first study task.
            </p>
          )}
        </div>
      </section>
    );
  }

  function renderNotes() {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">YOUR KNOWLEDGE HUB</p>
            <h2>My Notes</h2>
          </div>
          <span className="panel-count">{notes.length} notes</span>
        </div>

        <form className="note-form" onSubmit={addNote}>
          <input
            value={newNoteTitle}
            onChange={(event) => setNewNoteTitle(event.target.value)}
            placeholder="Note title"
            maxLength="200"
            required
          />

          <textarea
            value={newNoteContent}
            onChange={(event) =>
              setNewNoteContent(event.target.value)
            }
            placeholder="Write your study note..."
            rows="4"
            maxLength="10000"
            required
          />

          <button type="submit">Save note</button>
        </form>

        <div className="notes-list">
          {notes.map((note) => (
            <article className="note-item" key={note.id}>
              <div>
                <h3>{note.title}</h3>
                <p>{note.content}</p>
              </div>

              <button
                className="delete-note"
                type="button"
                onClick={() => handleDeleteNote(note.id)}
                aria-label={`Delete ${note.title}`}
              >
                ×
              </button>
            </article>
          ))}

          {notes.length === 0 && (
            <p className="auth-demo-note">
              No notes yet. Save your first study note.
            </p>
          )}
        </div>
      </section>
    );
  }

  function renderAIStudyTools() {
    return (
      <section className="ai-panel">
        <div className="ai-symbol">✦</div>

        <div className="ai-content">
          <p className="eyebrow">LOCAL AI STUDY ASSISTANT</p>
          <h2>Learn a topic in a simpler way.</h2>

          <p>
            Ask Qwen to explain a topic, share key points, and
            create practice questions.
          </p>

          <form
            className="add-form"
            onSubmit={handleGenerateStudyGuide}
          >
            <input
              value={studyTopic}
              onChange={(event) => setStudyTopic(event.target.value)}
              placeholder="Try: Python loops"
              maxLength="200"
              required
            />

            <button type="submit" disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </form>

          {isGenerating && (
            <p className="backend-status" role="status">
              Qwen is preparing your study guide. This may take a
              little time.
            </p>
          )}

          {studyError && (
            <p className="backend-status" role="alert">
              {studyError}
            </p>
          )}

          {studyGuide && (
            <div className="study-guide">
              <div className="study-guide-content">
                <ReactMarkdown>{studyGuide}</ReactMarkdown>
              </div>
            </div>
          )}

          <p className="auth-demo-note">
            Powered by Qwen running locally through Ollama.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">L</div>
          <span>LearnLens AI</span>
        </div>

        <nav className="navigation">
          {[
            ["dashboard", "▦", "Dashboard"],
            ["tasks", "✓", "My Tasks"],
            ["notes", "▤", "My Notes"],
            ["ai-tools", "✦", "AI Study Tools"],
          ].map(([page, icon, label]) => (
            <button
              key={page}
              type="button"
              className={`nav-link ${view === page ? "active" : ""}`}
              onClick={() => {
                setView(page);
                setDataError("");
              }}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">
              {userName ? userName.charAt(0).toUpperCase() : "S"}
            </div>

            <div>
              <strong>{userName || "Student"}</strong>
              <small>Student account</small>
            </div>
          </div>

          <button className="logout-button" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR LEARNING SPACE</p>
            <h1>
              {{
                dashboard: "Dashboard",
                tasks: "My Tasks",
                notes: "My Notes",
                "ai-tools": "AI Study Tools",
              }[view]}
            </h1>
          </div>

          <div className="welcome-user">
            <span>Welcome, {userName || "Student"}!</span>
            <div className="avatar">
              {userName ? userName.charAt(0).toUpperCase() : "S"}
            </div>
          </div>
        </header>

        <p className="backend-status">
          Backend status: {backendStatus}
        </p>

        {dataError && (
          <p className="backend-status" role="alert">
            {dataError}
          </p>
        )}

        {view === "dashboard" && (
          <>
            <section className="welcome-banner">
              <div>
                <p className="banner-label">
                  YOUR PERSONAL STUDY COMPANION
                </p>
                <h2>Make every study session count.</h2>
                <p>
                  Organize your tasks, save your notes, and learn at
                  your own pace.
                </p>
              </div>
              <div className="banner-art">✦</div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon purple">✓</div>
                <p>Total tasks</p>
                <h2>{tasks.length}</h2>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">↗</div>
                <p>Completed tasks</p>
                <h2>{completedTasks}</h2>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">▤</div>
                <p>Saved notes</p>
                <h2>{notes.length}</h2>
              </div>
            </section>

            <section className="content-grid">
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">STAY ON TRACK</p>
                    <h2>My Tasks</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView("tasks")}
                  >
                    View all
                  </button>
                </div>

                <p>
                  {tasks.length} tasks · {completedTasks} completed
                </p>
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">YOUR KNOWLEDGE HUB</p>
                    <h2>My Notes</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView("notes")}
                  >
                    View all
                  </button>
                </div>

                <p>{notes.length} saved notes</p>
              </div>
            </section>

            <section className="ai-panel">
              <div className="ai-symbol">✦</div>
              <div className="ai-content">
                <p className="eyebrow">AI LEARNING</p>
                <h2>Need help understanding a topic?</h2>
                <p>
                  Generate simplified explanations and practice
                  questions with your local AI study assistant.
                </p>
                <button
                  type="button"
                  onClick={() => setView("ai-tools")}
                >
                  Open AI Study Tools
                </button>
              </div>
            </section>
          </>
        )}

        {view === "tasks" && renderTasks()}
        {view === "notes" && renderNotes()}
        {view === "ai-tools" && renderAIStudyTools()}
      </main>
    </div>
  );
}

export default App;