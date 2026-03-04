import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import Avatar from "../components/Avatar";
import ConfirmModal from "../components/ConfirmModal";
import TaskDetailPopup from "../components/TaskDetailPopup";
import ProjectNavButtons, { NewTaskButton, ProjectLoadingSpinner, useStickyCompact, stickyTransition } from "../components/ProjectNavButtons";
import CustomSelect from "../components/CustomSelect";

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

const STATUS_KEY_MAP = {
  BACKLOG: "backlog",
  IN_PROGRESS: "in_progress",
  REVIEW: "review",
  DONE: "done",
};

function getTaskColumnKey(task) {
  if (task.customStatus) return task.customStatus;
  return STATUS_KEY_MAP[(task.status || "").toUpperCase()] || "backlog";
}

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
  const { sentinelRef, compact } = useStickyCompact();
  const role = (user?.role && String(user.role).toUpperCase()) || "";
  const isAdmin = role === "ADMIN";
  const canEditProject = role === "ADMIN" || role === "MEMBER";

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);

  const columnsMap = useMemo(() => {
    const m = new Map();
    columns.forEach((c) => m.set(c.key, c));
    return m;
  }, [columns]);

  const statusOptions = useMemo(() => {
    return columns.map((c) => ({ value: c.key, label: c.label }));
  }, [columns]);
  const [error, setError] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);

  const [filterKey, setFilterKey] = useState("");
  const [filterId, setFilterId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssign, setFilterAssign] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: "",
    priority: "MEDIUM",
    files: [],
  });
  const [saving, setSaving] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [editingProject, setEditingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: "", description: "", startDate: "", endDate: "", status: "ACTIVE" });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskEditForm, setTaskEditForm] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, task: null });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDeleteTask() {
    const task = deleteConfirm.task;
    if (!task) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiFetch(`/tasks/${task.id}`, { method: "DELETE" });
      const tasksRes = await apiFetch(`/projects/${id}/tasks`);
      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
      setDeleteConfirm({ open: false, task: null });
    } catch (err) {
      setDeleteError(err.message || "Error al eliminar la tarea");
    } finally {
      setDeleting(false);
    }
  }

  async function loadData() {
    setError("");
    setLoading(true);
    try {
      const [projRes, tasksRes, usersRes, colsRes] = await Promise.all([
        apiFetch(`/projects/${id}`),
        apiFetch(`/projects/${id}/tasks`).catch(() => []),
        apiFetch("/users").catch(() => []),
        apiFetch(`/projects/${id}/columns`).catch(() => []),
      ]);
      setProject(projRes.project ?? projRes);
      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
      setUsers(Array.isArray(usersRes) ? usersRes : (usersRes?.users ?? []));
      setColumns(Array.isArray(colsRes) ? colsRes : []);
    } catch (err) {
      setError(err.message || "Error cargando proyecto");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  async function handleCreateTask(e) {
    e.preventDefault();
    setTaskError("");
    setSaving(true);
    try {
      const task = await apiFetch("/tasks", {
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

      if (taskForm.files.length > 0) {
        const fd = new FormData();
        for (const f of taskForm.files) fd.append("files", f);
        await apiFetch(`/tasks/${task.id}/attachments`, { method: "POST", body: fd });
      }

      setTaskForm({ title: "", description: "", assigneeId: "", dueDate: "", priority: "MEDIUM", files: [] });
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

  const [lockError, setLockError] = useState("");

  async function startEditTask(t) {
    setLockError("");
    setSaveError("");
    try {
      await apiFetch(`/tasks/${t.id}/lock`, { method: "POST" });
      setEditingTaskId(t.id);
      setTaskEditForm({
        title: t.title || "",
        description: t.description || "",
        assigneeId: t.assigneeId || t.assignee?.id || "",
        dueDate: t.dueDate || t.due_date ? (t.dueDate || t.due_date).slice(0, 10) : "",
        priority: (t.priority || "MEDIUM").toUpperCase(),
        status: getTaskColumnKey(t),
        progress: Number(t.progress) || 0,
      });
    } catch (err) {
      setLockError(err.message || "No se pudo bloquear la tarea para edición");
    }
  }

  async function cancelEditTask() {
    if (editingTaskId) {
      try { await apiFetch(`/tasks/${editingTaskId}/lock`, { method: "DELETE" }); } catch {}
    }
    setEditingTaskId(null);
    setTaskEditForm(null);
    setSaveError("");
  }

  async function handleSaveTask(e) {
    e.preventDefault();
    if (!editingTaskId) return;
    setSaveError("");
    setSaving(true);
    try {
      const isBaseKey = ["backlog", "in_progress", "review", "done"].includes(taskEditForm.status);
      const statusPayload = isBaseKey
        ? { status: taskEditForm.status.toUpperCase().replace("-", "_"), customStatus: null }
        : { customStatus: taskEditForm.status };

      await apiFetch(`/tasks/${editingTaskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: taskEditForm.title.trim(),
          description: taskEditForm.description.trim() || null,
          assigneeId: taskEditForm.assigneeId || null,
          dueDate: taskEditForm.dueDate || null,
          priority: taskEditForm.priority,
          ...statusPayload,
          progress: taskEditForm.progress,
        }),
      });
      try { await apiFetch(`/tasks/${editingTaskId}/lock`, { method: "DELETE" }); } catch {}
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


  const today = new Date().toISOString().slice(0, 10);

  const statusLabelForTask = (task) => {
    const key = getTaskColumnKey(task);
    const col = columnsMap.get(key);
    if (col) return col.label;
    const fallback = { backlog: "Backlog", in_progress: "En proceso", review: "En revisión", done: "Finalizado" };
    return fallback[key] || key || "—";
  };
  const priorityLabel = (p) => {
    const map = { high: "Alta", medium: "Media", low: "Baja", HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" };
    return map[p] || p || "—";
  };

  if (loading) {
    return <ProjectLoadingSpinner />;
  }

  if (error || !project) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/projects" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-400">
          ← Volver a proyectos
        </Link>
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error || "Proyecto no encontrado"}
        </div>
      </div>
    );
  }

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("es-ES") : "-");

  const filterElements = (vertical) => (
    <>
      <input type="text" placeholder="Clave..." value={filterKey} onChange={(e) => setFilterKey(e.target.value)} className={`${vertical ? "w-full" : "w-28"} rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-sm text-slate-500 dark:text-slate-400 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20`} />
      <input type="text" placeholder="ID..." value={filterId} onChange={(e) => setFilterId(e.target.value)} className={`${vertical ? "w-full" : "w-24"} rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-sm text-slate-500 dark:text-slate-400 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20`} />
      <CustomSelect
        value={filterType}
        onChange={(val) => setFilterType(val)}
        options={[{ value: "", label: "Todos los tipos" }, ...[...new Set(tasks.map((t) => parseTaskTitle(t.title).type).filter(Boolean))].sort().map((tp) => ({ value: tp, label: tp }))]}
        size="sm"
      />
      <CustomSelect
        value={filterStatus}
        onChange={(val) => setFilterStatus(val)}
        options={[{ value: "", label: "Todos los estados" }, ...statusOptions]}
        size="sm"
      />
      <CustomSelect
        value={filterAssign}
        onChange={(val) => setFilterAssign(val)}
        options={[{ value: "", label: "Cualquier asignación" }, { value: "assigned", label: "Asignadas" }, { value: "unassigned", label: "Sin asignar" }]}
        size="sm"
      />
      <CustomSelect
        value={sortOrder}
        onChange={(val) => setSortOrder(val)}
        options={[{ value: "asc", label: "Ascendente" }, { value: "desc", label: "Descendente" }]}
        size="sm"
      />
      {(filterKey || filterId || filterType || filterStatus || filterAssign) && (
        <button type="button" onClick={() => { setFilterKey(""); setFilterId(""); setFilterType(""); setFilterStatus(""); setFilterAssign(""); }} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200">Limpiar</button>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <div ref={sentinelRef} className="h-px w-full -mb-px" />

      {compact && (
        <div className="fixed top-16 z-40 w-44 flex flex-col gap-3" style={{ left: "max(100px, calc((100vw - 1364px) / 4 - 4px))" }}>
          <Link to="/projects" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 transition hover:bg-slate-50 dark:hover:bg-slate-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <ProjectNavButtons projectId={id} current="detail" compact />
          {filterElements(true)}
          <NewTaskButton onClick={() => { setShowNewTask(true); setTaskError(""); }} />
        </div>
      )}

      <div className={`sticky top-0 z-30 ${compact ? "py-3" : "flex flex-col gap-3"}`} style={stickyTransition.wrapper(compact)}>
        <div className="flex flex-wrap items-center gap-3" style={stickyTransition.navRow(compact)}>
          <Link to="/projects" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 transition hover:bg-slate-50 dark:hover:bg-slate-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="mr-auto">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{project.name}</h2>
          </div>
          <ProjectNavButtons projectId={id} current="detail" />
          <NewTaskButton onClick={() => { setShowNewTask(true); setTaskError(""); }} />
        </div>

        {!compact && tasks.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 py-1">
            {filterElements(false)}
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{tasks.length} tareas</span>
          </div>
        )}
      </div>

      {editingProject && canEditProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setEditingProject(false); setSaveError(""); }}>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Editar proyecto</h3>
              <button type="button" onClick={() => { setEditingProject(false); setSaveError(""); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
            <form onSubmit={handleSaveProject} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Nombre</label>
                <input type="text" required value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Descripción</label>
                <textarea value={projectForm.description} onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Fecha inicio</label>
                  <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm((f) => ({ ...f, startDate: e.target.value }))} className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Fecha fin</label>
                  <input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm((f) => ({ ...f, endDate: e.target.value }))} className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Estado</label>
                <CustomSelect
                  value={projectForm.status}
                  onChange={(val) => setProjectForm((f) => ({ ...f, status: val }))}
                  options={PROJECT_STATUSES}
                  className="w-full"
                />
              </div>
              {saveError && <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{saveError}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setEditingProject(false); setSaveError(""); }} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-indigo-400 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60">{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="content-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {project.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{project.description}</p>
            )}
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Inicio</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">{formatDate(project.startDate ?? project.start_date)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Fin</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">{formatDate(project.endDate ?? project.end_date)}</dd>
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
          {canEditProject && !editingProject && (
            <button
              type="button"
              onClick={startEditProject}
              className="shrink-0 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Editar proyecto
            </button>
          )}
        </div>
      </div>

      {showNewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowNewTask(false); setTaskError(""); }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Crear tarea</h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Añade una tarea al proyecto</p>
              </div>
              <button type="button" onClick={() => { setShowNewTask(false); setTaskError(""); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <div>
                <label htmlFor="task-title" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Título *</label>
                <input
                  id="task-title"
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Revisar maquetas"
                  className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                  className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label htmlFor="task-assignee" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Asignar a</label>
                <CustomSelect
                  value={taskForm.assigneeId}
                  onChange={(val) => setTaskForm((f) => ({ ...f, assigneeId: val }))}
                  options={[{ value: "", label: "Sin asignar" }, ...users.map((u) => ({ value: u.id, label: `${u.name}${u.email ? ` (${u.email})` : ""}` }))]}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="task-due" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Fecha límite</label>
                <input
                  id="task-due"
                  type="date"
                  min={today}
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Archivos adjuntos</label>
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setTaskForm((f) => ({ ...f, files: [...f.files, ...Array.from(e.target.files || [])] }))}
                    className="w-full rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-indigo-600 dark:file:bg-indigo-500/20 dark:file:text-indigo-400 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-500/30 cursor-pointer"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
                  />
                </div>
                {taskForm.files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {taskForm.files.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200">
                        {f.type?.startsWith("image/") ? (
                          <svg className="h-3.5 w-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        ) : (
                          <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        )}
                        <span className="max-w-[120px] truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setTaskForm((prev) => ({ ...prev, files: prev.files.filter((_, idx) => idx !== i) }))}
                          className="ml-0.5 text-slate-400 hover:text-red-500"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Máx. 10 MB por archivo. Imágenes, PDF, Office, CSV, ZIP.</p>
              </div>
              {taskError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">{taskError}</div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowNewTask(false); setTaskError(""); }}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-400 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
                >
                  {saving ? "Creando..." : "Crear tarea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingTaskId && taskEditForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={cancelEditTask} onKeyDown={(e) => { if (e.key === "Escape") cancelEditTask(); }} tabIndex={-1} ref={(el) => el?.focus()}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Editar tarea</h3>
              <button type="button" onClick={cancelEditTask} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
            <form onSubmit={handleSaveTask} className="flex flex-col gap-4">
              {(() => { const memberIsAssignee = !isAdmin && taskEditForm.assigneeId === user?.id; const canEditField = isAdmin; const canEditProgress = isAdmin || memberIsAssignee; return (<>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Título</label>
                <input type="text" required value={taskEditForm.title} onChange={(e) => setTaskEditForm((f) => ({ ...f, title: e.target.value }))} disabled={!canEditField} className={`w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${!canEditField ? "opacity-60 cursor-not-allowed" : ""}`} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Descripción</label>
                <textarea value={taskEditForm.description} onChange={(e) => setTaskEditForm((f) => ({ ...f, description: e.target.value }))} rows={2} disabled={!canEditField} className={`w-full rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${!canEditField ? "opacity-60 cursor-not-allowed" : ""}`} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Asignar a</label>
                <CustomSelect
                  value={taskEditForm.assigneeId}
                  onChange={(val) => setTaskEditForm((f) => ({ ...f, assigneeId: val }))}
                  options={[{ value: "", label: "Sin asignar" }, ...(isAdmin ? users : users.filter((u) => u.id === user?.id)).map((u) => ({ value: u.id, label: u.name }))]}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Fecha límite</label>
                  <input type="date" min={today} value={taskEditForm.dueDate} onChange={(e) => setTaskEditForm((f) => ({ ...f, dueDate: e.target.value }))} disabled={!canEditField} className={`w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${!canEditField ? "opacity-60 cursor-not-allowed" : ""}`} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Progreso</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={0} max={100} value={taskEditForm.progress} onChange={(e) => setTaskEditForm((f) => ({ ...f, progress: Number(e.target.value) }))} disabled={!canEditProgress} className={`flex-1 accent-indigo-600 ${!canEditProgress ? "opacity-60 cursor-not-allowed" : ""}`} />
                    <span className="w-10 text-right text-sm font-semibold text-indigo-600 dark:text-indigo-400">{taskEditForm.progress}%</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Prioridad</label>
                  <CustomSelect
                    value={taskEditForm.priority}
                    onChange={(val) => setTaskEditForm((f) => ({ ...f, priority: val }))}
                    options={PRIORITIES}
                    disabled={!canEditField}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Estado</label>
                  <CustomSelect
                    value={taskEditForm.status}
                    onChange={(val) => setTaskEditForm((f) => ({ ...f, status: val }))}
                    options={statusOptions}
                    disabled={!canEditProgress}
                    className="w-full"
                  />
                </div>
              </div>
              </>); })()}
              {saveError && <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{saveError}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={cancelEditTask} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-indigo-400 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60">{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lockError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setLockError("")}
          onKeyDown={(e) => { if (e.key === "Escape") setLockError(""); }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div className="w-full max-w-sm rounded-xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
                <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{lockError}</p>
              <button
                type="button"
                onClick={() => setLockError("")}
                className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {tasks.length > 0 && (() => {
        const filteredTasks = tasks.filter((t) => {
          const parsed = parseTaskTitle(t.title);
          if (filterKey && !parsed.key.toLowerCase().includes(filterKey.toLowerCase())) return false;
          if (filterId && !parsed.id.includes(filterId)) return false;
          if (filterType && parsed.type !== filterType) return false;
          if (filterStatus && getTaskColumnKey(t) !== filterStatus) return false;
          if (filterAssign === "assigned" && !t.assigneeId && !t.assignee?.id) return false;
          if (filterAssign === "unassigned" && (t.assigneeId || t.assignee?.id)) return false;
          return true;
        });

        const sortedTasks = [...filteredTasks].sort((a, b) => {
          const aKey = parseTaskTitle(a.title).key;
          const bKey = parseTaskTitle(b.title).key;
          const aNum = parseInt((aKey.match(/\d+/) || ["0"])[0], 10);
          const bNum = parseInt((bKey.match(/\d+/) || ["0"])[0], 10);
          return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
        });

        const hasActiveFilters = filterKey || filterId || filterType || filterStatus || filterAssign;

        return (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tareas del proyecto ({tasks.length})</h2>
            {hasActiveFilters && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Mostrando {sortedTasks.length} de {tasks.length}
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {sortedTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No se encontraron tareas con los filtros aplicados</p>
            ) : sortedTasks.map((t) => {
              const canEditTask = isAdmin || role === "MEMBER";
              return (
                <div key={t.id} className="rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSelectedTask(t)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-slate-400 dark:text-slate-500">▶</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{t.title}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400 shrink-0">
                        {t.assignee?.name ? `→ ${t.assignee.name}` : "Sin asignar"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          columnsMap.get(getTaskColumnKey(t))?.color
                            ? ""
                            : "bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200"
                        }`}
                        style={
                          columnsMap.get(getTaskColumnKey(t))?.color
                            ? { backgroundColor: columnsMap.get(getTaskColumnKey(t)).color, color: "#fff" }
                            : undefined
                        }
                      >
                        {statusLabelForTask(t)}
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
                      {isAdmin && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ open: true, task: t });
                            setDeleteError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.stopPropagation();
                            setDeleteConfirm({ open: true, task: t });
                            setDeleteError("");
                          }}
                          className="rounded-lg border border-red-200 dark:border-red-500/30 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                          title="Eliminar tarea"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}

      <ConfirmModal
        open={deleteConfirm.open}
        title="Eliminar tarea"
        message={
          deleteConfirm.task
            ? `¿Eliminar la tarea "${deleteConfirm.task.title}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteTask}
        onCancel={() => { setDeleteConfirm({ open: false, task: null }); setDeleteError(""); }}
      />
      {deleteError && !deleteConfirm.open && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-red-200 dark:border-red-500/30 bg-white dark:bg-slate-900 px-4 py-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-600 dark:text-red-400">{deleteError}</span>
            <button type="button" onClick={() => setDeleteError("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
      {selectedTask && (
        <TaskDetailPopup
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
