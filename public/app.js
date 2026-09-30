const API = "/api/tasks";

const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const emptyMsg = document.getElementById("emptyMsg");
const counter = document.getElementById("counter");
const clearBtn = document.getElementById("clearBtn");
const filtersEl = document.getElementById("filters");

let tasks = [];
let currentFilter = "all";

// ---------- API helpers ----------
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}

async function loadTasks() {
  try {
    tasks = await request(API);
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function addTask() {
  const title = taskInput.value.trim();
  if (!title) return;
  try {
    const task = await request(API, {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    tasks.unshift(task);
    taskInput.value = "";
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function updateTask(id, changes) {
  try {
    const updated = await request(`${API}/${id}`, {
      method: "PUT",
      body: JSON.stringify(changes),
    });
    tasks = tasks.map((t) => (t.id === id ? updated : t));
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteTask(id) {
  try {
    await request(`${API}/${id}`, { method: "DELETE" });
    tasks = tasks.filter((t) => t.id !== id);
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function clearCompleted() {
  try {
    await request(API, { method: "DELETE" });
    tasks = tasks.filter((t) => !t.completed);
    render();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- Rendering ----------
function getVisibleTasks() {
  if (currentFilter === "active") return tasks.filter((t) => !t.completed);
  if (currentFilter === "completed") return tasks.filter((t) => t.completed);
  return tasks;
}

function render() {
  const visible = getVisibleTasks();
  taskList.innerHTML = "";

  visible.forEach((task) => taskList.appendChild(createTaskElement(task)));

  emptyMsg.hidden = visible.length > 0;

  const left = tasks.filter((t) => !t.completed).length;
  counter.textContent = `${left} task${left === 1 ? "" : "s"} left`;
}

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task" + (task.completed ? " done" : "");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.addEventListener("change", () =>
    updateTask(task.id, { completed: checkbox.checked })
  );

  const title = document.createElement("span");
  title.className = "title";
  title.textContent = task.title; // textContent prevents XSS
  title.addEventListener("dblclick", () => startEditing(li, title, task));

  const del = document.createElement("button");
  del.className = "delete-btn";
  del.textContent = "✕";
  del.title = "Delete task";
  del.addEventListener("click", () => deleteTask(task.id));

  li.append(checkbox, title, del);
  return li;
}

function startEditing(li, titleEl, task) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit-input";
  input.value = task.title;
  input.maxLength = 200;

  li.replaceChild(input, titleEl);
  input.focus();
  input.select();

  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    const value = input.value.trim();
    if (save && value && value !== task.title) {
      updateTask(task.id, { title: value });
    } else {
      render();
    }
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
}

// ---------- Events ----------
addBtn.addEventListener("click", addTask);
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});

clearBtn.addEventListener("click", clearCompleted);

filtersEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter");
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  document
    .querySelectorAll(".filter")
    .forEach((b) => b.classList.toggle("active", b === btn));
  render();
});

loadTasks();