import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";

const PRIORITIES = [
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Media" },
  { value: "LOW", label: "Baja" },
];

const PROJECT_STATUSES = [
  { value: "ACTIVE", label: "Activo" },
  { value: "PAUSED", label: "Pausado" },
  { value: "COMPLETED", label: "Finalizado" },
];

const TASK_STATUSES = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "IN_PROGRESS", label: "En proceso" },
  { value: "REVIEW", label: "En revisión" },
  { value: "DONE", label: "Finalizado" },
];

function parseTaskTitle(title) {
  if (!title) return { key: "", id: "", type: "" };
  const parts = title.split("·").map((s) => s.trim());
  if (parts.length >= 3) return { key: parts[0], id: parts[1], type: parts[2] };
  if (parts.length === 2) return { key: parts[0], id: parts[1], type: "" };
  return { key: title, id: "", type: "" };
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const role = (user?.role && String(user.role).toUpperCase()) || "";
  const isAdmin = role === "ADMIN";
  const canEditProject = role === "ADMIN" || role === "MEMBER";

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);

  const [filterKey, setFilterKey] = useState("");
  const [filterId, setFilterId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: "",
    priority: "MEDIUM",
  });
  const [saving, setSaving] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [editingProject, setEditingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: "", description: "", startDate: "", endDate: "", status: "ACTIVE" });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskEditForm, setTaskEditForm] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    async function load() {
      setError("");
      setLoading(true);
      try {
        const [projRes, tasksRes, usersRes] = await Promise.all([
          apiFetch(`/projects/${id}`),
          apiFetch(`/projects/${id}/tasks`).catch(() => []),
          apiFetch("/users").catch(() => []),
        ]);
        setProject(projRes.project ?? projRes);
        setTasks(Array.isArray(tasksRes) ? tasksRes : []);
        setUsers(Array.isArray(usersRes) ? usersRes : (usersRes?.users ?? []));
      } catch (err) {
        setError(err.message || "Error cargando proyecto");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleCreateTask(e) {
    e.preventDefault();
    setTaskError("");
    setSaving(true);
    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          projectId: id,
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || null,
          assigneeId: taskForm.assigneeId || null,
          dueDate: taskForm.dueDate || null,
          priority: taskForm.priority,
        }),
      });
      setTaskForm({ title: "", description: "", assigneeId: "", dueDate: "", priority: "MEDIUM" });
      setShowNewTask(false);
      const tasksRes = await apiFetch(`/projects/${id}/tasks`);
      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
    } catch (err) {
      setTaskError(err.message || "Error al crear la tarea");
    } finally {
      setSaving(false);
    }
  }

  function startEditProject() {
    setEditingProject(true);
    setProjectForm({
      name: project.name || "",
      description: project.description || "",
      startDate: project.startDate ? project.startDate.slice(0, 10) : "",
      endDate: project.endDate ? project.endDate.slice(0, 10) : "",
      status: project.status || "ACTIVE",
    });
    setSaveError("");
  }

  async function handleSaveProject(e) {
    e.preventDefault();
    setSaveError("");
    setSaving(true);
    try {
      const data = await apiFetch(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: projectForm.name.trim(),
          description: projectForm.description.trim() || null,
          startDate: projectForm.startDate || null,
          endDate: projectForm.endDate || null,
          status: projectForm.status,
        }),
      });
      setProject(data.project ?? data);
      setEditingProject(false);
    } catch (err) {
      setSaveError(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function startEditTask(t) {
    setEditingTaskId(t.id);
    setTaskEditForm({
      title: t.title || "",
      description: t.description || "",
      assigneeId: t.assigneeId || t.assignee?.id || "",
      dueDate: t.dueDate || t.due_date ? (t.dueDate || t.due_date).slice(0, 10) : "",
      priority: (t.priority || "MEDIUM").toUpperCase(),
      status: (t.status || "BACKLOG").toUpperCase().replace("-", "_"),
      progress: Number(t.progress) || 0,
    });
    setSaveError("");
  }

  async function handleSaveTask(e) {
    e.preventDefault();
    if (!editingTaskId) return;
    setSaveError("");
    setSaving(true);
    try {
      await apiFetch(`/tasks/${editingTaskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: taskEditForm.title.trim(),
          description: taskEditForm.description.trim() || null,
          assigneeId: taskEditForm.assigneeId || null,
          dueDate: taskEditForm.dueDate || null,
          priority: taskEditForm.priority,
          status: taskEditForm.status,
          progress: taskEditForm.progress,
        }),
      });
      setEditingTaskId(null);
      setTaskEditForm(null);
      const [projRes, tasksRes] = await Promise.all([
        apiFetch(`/projects/${id}`),
        apiFetch(`/projects/${id}/tasks`),
      ]);
      setProject(projRes.project ?? projRes);
      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
    } catch (err) {
      setSaveError(err.message || "Error al guardar la tarea");
    } finally {
      setSaving(false);
    }
  }

  async function toggleExpandTask(taskId) {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
      setComments([]);
      return;
    }
    setExpandedTaskId(taskId);
    setLoadingComments(true);
    try {
      const res = await apiFetch(`/comments/by-task/${taskId}`);
      setComments(res.comments ?? (Array.isArray(res) ? res : []));
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim() || !expandedTaskId) return;
    setSendingComment(true);
    try {
      await apiFetch("/comments", {
        method: "POST",
        body: JSON.stringify({ taskId: expandedTaskId, body: newComment.trim() }),
      });
      setNewComment("");
      const res = await apiFetch(`/comments/by-task/${expandedTaskId}`);
      setComments(res.comments ?? (Array.isArray(res) ? res : []));
    } catch (err) {
      alert(err.message || "Error al enviar comentario");
    } finally {
      setSendingComment(false);
    }
  }

  async function handleDeleteComment(commentId) {
    if (!confirm("¿Borrar este comentario?")) return;
    try {
      await apiFetch(`/comments/${commentId}`, { method: "DELETE" });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert(err.message || "Error al borrar comentario");
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  const statusLabel = (s) => {
    const map = { backlog: "Backlog", in_progress: "En proceso", review: "En revision", done: "Finalizado", BACKLOG: "Backlog", IN_PROGRESS: "En proceso", REVIEW: "En revision", DONE: "Finalizado" };
    return map[s] || s || "—";
  };
  const priorityLabel = (p) => {
    const map = { high: "Alta", medium: "Media", low: "Baja", HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" };
    return map[p] || p || "—";
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-white dark:bg-slate-800 px-5 py-4 text-sm text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200/80 dark:border-slate-700">
        Cargando...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/projects" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-400">
          ← Volver a proyectos
        </Link>
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error || "Proyecto no encontrado"}
        </div>
      </div>
    );
  }

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("es-ES") : "-");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{project.name}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Detalle del proyecto</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEditProject && !editingProject && (
            <button
              type="button"
              onClick={startEditProject}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Editar proyecto
            </button>
          )}
          <Link
            to="/projects"
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            ← Proyectos
          </Link>
        </div>
      </div>

      {editingProject && canEditProject ? (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Editar proyecto</h2>
          <form onSubmit={handleSaveProject} className="mt-4 flex max-w-lg flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Nombre</label>
              <input
                type="text"
                required
                value={projectForm.name}
                onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Descripción</label>
              <textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Fecha inicio</label>
                <input
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Fecha fin</label>
                <input
                  type="date"
                  value={projectForm.endDate}
                  onChange={(e) => setProjectForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Estado</label>
              <select
                value={projectForm.status}
                onChange={(e) => setProjectForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full max-w-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            {saveError && <div className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">{saveError}</div>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button type="button" onClick={() => { setEditingProject(false); setSaveError(""); }} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : (
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        {project.description && (
          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{project.description}</p>
        )}
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Inicio</dt>
            <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">{formatDate(project.startDate ?? project.start_date)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Fin</dt>
            <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">{formatDate(project.endDate ?? project.end_date)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Estado</dt>
            <dd className="mt-0.5">
              <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                {project.status === "ACTIVE" ? "Activo" : project.status === "PAUSED" ? "Pausado" : project.status === "COMPLETED" ? "Finalizado" : project.status ?? "—"}
              </span>
            </dd>
          </div>
          {project.leadName && (
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Responsable</dt>
              <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">{project.leadName}</dd>
            </div>
          )}
        </dl>
      </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`/projects/${id}/kanban`}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700"
        >
          Ver Kanban
        </Link>
        <Link
          to={`/projects/${id}/executive`}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          Tabla ejecutiva
        </Link>
        <button
          type="button"
          onClick={() => { setShowNewTask(true); setTaskError(""); }}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow-md transition hover:bg-emerald-700"
        >
          + Nueva tarea
        </button>
      </div>

      {showNewTask && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Crear tarea</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Añade una tarea al proyecto y asígnala a alguien</p>
          <form onSubmit={handleCreateTask} className="mt-5 flex flex-col gap-4">
            <div>
              <label htmlFor="task-title" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Título *</label>
              <input
                id="task-title"
                type="text"
                required
                value={taskForm.title}
                onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Revisar maquetas"
                className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label htmlFor="task-desc" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Descripción</label>
              <textarea
                id="task-desc"
                value={taskForm.description}
                onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Opcional"
                rows={2}
                className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label htmlFor="task-assignee" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Asignar a</label>
              <select
                id="task-assignee"
                value={taskForm.assigneeId}
                onChange={(e) => setTaskForm((f) => ({ ...f, assigneeId: e.target.value }))}
                className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Sin asignar</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} {u.email ? `(${u.email})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-due" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Fecha límite</label>
              <input
                id="task-due"
                type="date"
                min={today}
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Prioridad</label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <label key={p.value} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="priority"
                      value={p.value}
                      checked={taskForm.priority === p.value}
                      onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {taskError && (
              <div className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">{taskError}</div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Creando..." : "Crear tarea"}
              </button>
              <button
                type="button"
                onClick={() => { setShowNewTask(false); setTaskError(""); }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {editingTaskId && taskEditForm && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Editar tarea</h2>
          <form onSubmit={handleSaveTask} className="mt-4 flex max-w-lg flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Título</label>
              <input
                type="text"
                required
                value={taskEditForm.title}
                onChange={(e) => setTaskEditForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Descripción</label>
              <textarea
                value={taskEditForm.description}
                onChange={(e) => setTaskEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Asignar a</label>
              <select
                value={taskEditForm.assigneeId}
                onChange={(e) => setTaskEditForm((f) => ({ ...f, assigneeId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Sin asignar</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Fecha límite</label>
                <input
                  type="date"
                  min={today}
                  value={taskEditForm.dueDate}
                  onChange={(e) => setTaskEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Progreso %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={taskEditForm.progress}
                  onChange={(e) => setTaskEditForm((f) => ({ ...f, progress: Number(e.target.value) || 0 }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Prioridad</label>
                <select
                  value={taskEditForm.priority}
                  onChange={(e) => setTaskEditForm((f) => ({ ...f, priority: e.target.value }))}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Estado</label>
                <select
                  value={taskEditForm.status}
                  onChange={(e) => setTaskEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {saveError && <div className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">{saveError}</div>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button type="button" onClick={() => { setEditingTaskId(null); setTaskEditForm(null); setSaveError(""); }} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {tasks.length > 0 && (() => {
        const uniqueKeys = [...new Set(tasks.map((t) => parseTaskTitle(t.title).key).filter(Boolean))].sort();
        const uniqueTypes = [...new Set(tasks.map((t) => parseTaskTitle(t.title).type).filter(Boolean))].sort();

        const filteredTasks = tasks.filter((t) => {
          const parsed = parseTaskTitle(t.title);
          if (filterKey && parsed.key !== filterKey) return false;
          if (filterId && !parsed.id.includes(filterId)) return false;
          if (filterType && parsed.type !== filterType) return false;
          if (filterStatus && (t.status || "").toUpperCase() !== filterStatus) return false;
          return true;
        });

        const sortedTasks = [...filteredTasks].sort((a, b) => {
          const aTitle = (a.title || "").toLowerCase();
          const bTitle = (b.title || "").toLowerCase();
          return sortOrder === "asc" ? aTitle.localeCompare(bTitle) : bTitle.localeCompare(aTitle);
        });

        const hasActiveFilters = filterKey || filterId || filterType || filterStatus;

        return (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tareas del proyecto ({tasks.length})</h2>

          {/* Barra de filtros */}
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 p-4">
            <div className="min-w-[140px]">
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Clave incidencia</label>
              <select
                value={filterKey}
                onChange={(e) => setFilterKey(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              >
                <option value="">Todas</option>
                {uniqueKeys.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[120px]">
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">ID incidencia</label>
              <input
                type="text"
                placeholder="Buscar ID..."
                value={filterId}
                onChange={(e) => setFilterId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>
            <div className="min-w-[130px]">
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Tipo incidencia</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              >
                <option value="">Todos</option>
                {uniqueTypes.map((tp) => (
                  <option key={tp} value={tp}>{tp}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[130px]">
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              >
                <option value="">Todos</option>
                {TASK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[130px]">
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Orden</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              >
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setFilterKey(""); setFilterId(""); setFilterType(""); setFilterStatus(""); }}
                className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Mostrando {sortedTasks.length} de {tasks.length} tareas
            </p>
          )}

          <div className="mt-4 space-y-3">
            {sortedTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No se encontraron tareas con los filtros aplicados</p>
            ) : sortedTasks.map((t) => {
              const canEditTask = isAdmin || (user?.id && (t.assigneeId === user.id || t.assignee?.id === user.id));
              const isExpanded = expandedTaskId === t.id;
              const due = t.dueDate || t.due_date;
              const isDone = (t.status || "").toUpperCase() === "DONE";
              const progress = isDone ? 100 : (Number(t.progress) || 0);
              return (
                <div key={t.id} className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleExpandTask(t.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-slate-400 dark:text-slate-500">{isExpanded ? "▼" : "▶"}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-100 truncate">{t.title}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400 shrink-0">
                        {t.assignee?.name ? `→ ${t.assignee.name}` : "Sin asignar"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-full bg-slate-200 dark:bg-slate-600 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                        {statusLabel(t.status)}
                      </span>
                      {canEditTask && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); startEditTask(t); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); startEditTask(t); } }}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          Editar
                        </span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (() => {
                    const creator = t.creatorName || null;
                    const reporter = t.reporterName || null;
                    const sameCreatorReporter = creator && reporter && creator.toLowerCase() === reporter.toLowerCase();
                    return (
                    <div className="border-t border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-4">
                      {/* Resumen */}
                      {t.summary && (
                        <div className="mb-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 p-4">
                          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">Resumen</span>
                          <p className="mt-1 text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{t.summary}</p>
                        </div>
                      )}

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                        <div>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Persona asignada</span>
                          <p className="mt-0.5 text-slate-800 dark:text-slate-100">{t.assignee?.name ?? "Sin asignar"}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Prioridad</span>
                          <p className="mt-0.5 text-slate-800 dark:text-slate-100">{priorityLabel(t.priority)}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Estado</span>
                          <p className="mt-0.5 text-slate-800 dark:text-slate-100">{statusLabel(t.status)}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Fecha creación</span>
                          <p className="mt-0.5 text-slate-800 dark:text-slate-100">
                            {t.createdAt
                              ? new Date(t.createdAt).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                              : "—"}
                          </p>
                        </div>
                        {t.resolvedAt && (
                          <div>
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Fecha resuelta</span>
                            <p className="mt-0.5 text-slate-800 dark:text-slate-100">
                              {new Date(t.resolvedAt).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Progreso</span>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{progress}%</span>
                          </div>
                        </div>

                        {/* Creador / Informador */}
                        {sameCreatorReporter ? (
                          <div>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Creador / Informador</span>
                            <p className="mt-0.5 text-slate-800 dark:text-slate-100">{creator}</p>
                          </div>
                        ) : (
                          <>
                            {creator && (
                              <div>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Creador</span>
                                <p className="mt-0.5 text-slate-800 dark:text-slate-100">{creator}</p>
                              </div>
                            )}
                            {reporter && (
                              <div>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Informador</span>
                                <p className="mt-0.5 text-slate-800 dark:text-slate-100">{reporter}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {t.description && (
                        <div className="mt-4">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Descripción</span>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{t.description}</p>
                        </div>
                      )}

                      <div className="mt-5 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Comentarios</h4>

                        {loadingComments ? (
                          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Cargando comentarios...</p>
                        ) : comments.length === 0 ? (
                          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Sin comentarios aún.</p>
                        ) : (
                          <ul className="mt-3 space-y-2">
                            {comments.map((c) => {
                              const authorDisplay = c.author?.name || c.authorName || "Usuario";
                              const canDelete = isAdmin || (c.authorId && c.authorId === user?.id);
                              return (
                                <li key={c.id} className="rounded-lg border border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 px-3 py-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                                        {authorDisplay.charAt(0).toUpperCase()}
                                      </span>
                                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{authorDisplay}</span>
                                      <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(c.createdAt).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                    {canDelete && (
                                      <button type="button" onClick={() => handleDeleteComment(c.id)} className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-400" title="Borrar comentario">
                                        Borrar
                                      </button>
                                    )}
                                  </div>
                                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{c.body}</p>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        {(role === "ADMIN" || role === "MEMBER") && (
                          <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
                            <input
                              type="text"
                              placeholder="Escribe un comentario..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                            />
                            <button type="submit" disabled={sendingComment || !newComment.trim()} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                              {sendingComment ? "..." : "Enviar"}
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
