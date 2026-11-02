const API_BASE_URL = "http://localhost:5001";

function getToken() {
  return localStorage.getItem("learnlensToken");
}

function getAuthHeaders() {
  const token = getToken();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

async function handleResponse(response, fallbackMessage) {
  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || fallbackMessage);
  }

  return data;
}

// ---------------- HEALTH CHECK ----------------

export async function checkBackend() {
  const response = await fetch(`${API_BASE_URL}/api/health`);

  return handleResponse(response, "Backend health check failed");
}

// ---------------- AUTHENTICATION ----------------

export async function registerUser(name, email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });

  return handleResponse(response, "Could not create account");
}

export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  return handleResponse(response, "Could not log in");
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response, "Could not verify your login");
}

// ---------------- AI STUDY ASSISTANT ----------------

export async function generateStudyGuide(topic) {
  const response = await fetch(`${API_BASE_URL}/api/study-guide`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ topic }),
  });

  return handleResponse(response, "Could not generate study guide");
}

// ---------------- TASK FUNCTIONS ----------------

export async function getTasks() {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response, "Could not load tasks");
}

export async function createTask(title) {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ title }),
  });

  return handleResponse(response, "Could not create task");
}

export async function updateTask(taskId, completed) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ completed }),
  });

  return handleResponse(response, "Could not update task");
}

export async function deleteTask(taskId) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response, "Could not delete task");
}

// ---------------- NOTE FUNCTIONS ----------------

export async function getNotes() {
  const response = await fetch(`${API_BASE_URL}/api/notes`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response, "Could not load notes");
}

export async function createNote(title, content) {
  const response = await fetch(`${API_BASE_URL}/api/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      title,
      content,
    }),
  });

  return handleResponse(response, "Could not create note");
}

export async function deleteNote(noteId) {
  const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response, "Could not delete note");
}