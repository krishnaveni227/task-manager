const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "tasks.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- Storage helpers ----------
async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readTasks() {
  const raw = await fs.readFile(DATA_FILE, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeTasks(tasks) {
  await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), "utf8");
}

// ---------- Routes ----------
// Get all tasks
app.get("/api/tasks", async (req, res) => {
  try {
    res.json(await readTasks());
  } catch (err) {
    res.status(500).json({ error: "Failed to read tasks" });
  }
});

// Create a task
app.post("/api/tasks", async (req, res) => {
  try {
    const title = (req.body.title || "").trim();
    if (!title) return res.status(400).json({ error: "Title is required" });

    const tasks = await readTasks();
    const task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    tasks.unshift(task);
    await writeTasks(tasks);
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Update a task (title and/or completed)
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const tasks = await readTasks();
    const task = tasks.find((t) => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (typeof req.body.title === "string") {
      const title = req.body.title.trim();
      if (!title) return res.status(400).json({ error: "Title cannot be empty" });
      task.title = title;
    }
    if (typeof req.body.completed === "boolean") {
      task.completed = req.body.completed;
    }

    await writeTasks(tasks);
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Delete a task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const tasks = await readTasks();
    const remaining = tasks.filter((t) => t.id !== req.params.id);
    if (remaining.length === tasks.length) {
      return res.status(404).json({ error: "Task not found" });
    }
    await writeTasks(remaining);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// Delete all completed tasks
app.delete("/api/tasks", async (req, res) => {
  try {
    const tasks = await readTasks();
    await writeTasks(tasks.filter((t) => !t.completed));
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to clear completed tasks" });
  }
});

// ---------- Start ----------
ensureStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`Task Manager running at http://localhost:${PORT}`);
  });
});