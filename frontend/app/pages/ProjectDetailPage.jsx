import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import Avatar from "../components/Avatar";
import ConfirmModal from "../components/ConfirmModal";
import TaskDetailPopup from "../components/TaskDetailPopup";
import ProjectNavButtons, { NewTaskButton, ProjectLoadingSpinner } from "../components/ProjectNavButtons";
import CustomSelect from "../components/CustomSelect";
import NewTaskModal from "../components/NewTaskModal";

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
  const [saving, setSaving] = useState(false);
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

  async function handleTaskCreated() {
    const tasksRes = await apiFetch(`/projects/${id}/tasks`);
    setTasks(Array.isArray(tasksRes) ? tasksRes : []);
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

  const filterElements = () => (
    <>
      <div className="flex-1 max-w-sm relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
        <input type="text" placeholder="Buscar por clave o ID..." value={filterKey} onChange={(e) => setFilterKey(e.target.value)} className={`w-full rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-9 pr-4 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20`} />
      </div>
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
      {(filterKey || filterType || filterStatus || filterAssign) && (
        <button type="button" onClick={() => { setFilterKey(""); setFilterType(""); setFilterStatus(""); setFilterAssign(""); }} className="rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:bg-slate-200 dark:hover:bg-slate-600">Limpiar</button>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/projects" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 transition hover:bg-slate-50 dark:hover:bg-slate-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="mr-auto">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{project.name}</h2>
          </div>
          <ProjectNavButtons projectId={id} current="detail" />
          <NewTaskButton onClick={() => setShowNewTask(true)} />
        </div>

        {tasks.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 py-1">
            {filterElements()}
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
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Nombre</label>
                <input type="text" required value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Descripción</label>
                <textarea value={projectForm.description} onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Fecha inicio</label>
                  <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm((f) => ({ ...f, startDate: e.target.value }))} className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Fecha fin</label>
                  <input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm((f) => ({ ...f, endDate: e.target.value }))} className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Estado</label>
                <CustomSelect
                  value={projectForm.status}
                  onChange={(val) => setProjectForm((f) => ({ ...f, status: val }))}
                  options={PROJECT_STATUSES}
                  className="w-full"
                />
              </div>
              {saveError && <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{saveError}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setEditingProject(false); setSaveError(""); }} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-indigo-400 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(95,150,249,0.4)] disabled:opacity-60 transition-all">{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project info card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {project.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{project.description}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 dark:text-slate-500">Inicio</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{formatDate(project.startDate ?? project.start_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 dark:text-slate-500">Fin</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{formatDate(project.endDate ?? project.end_date)}</span>
              </div>
              <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                {project.status === "ACTIVE" ? "Activo" : project.status === "PAUSED" ? "Pausado" : project.status === "COMPLETED" ? "Finalizado" : project.status ?? "—"}
              </span>
              {project.leadName && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 dark:text-slate-500">Responsable</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{project.leadName}</span>
                </div>
              )}
            </div>
          </div>
          {canEditProject && !editingProject && (
            <button
              type="button"
              onClick={startEditProject}
              className="shrink-0 flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
              Editar proyecto
            </button>
          )}
        </div>
      </div>

      <NewTaskModal
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        projectId={id}
        users={users}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        onCreated={handleTaskCreated}
      />

      {editingTaskId && taskEditForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={cancelEditTask} onKeyDown={(e) => { if (e.key === "Escape") cancelEditTask(); }}>
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
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Título</label>
                <input type="text" required value={taskEditForm.title} onChange={(e) => setTaskEditForm((f) => ({ ...f, title: e.target.value }))} disabled={!canEditField} className={`w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${!canEditField ? "opacity-60 cursor-not-allowed" : ""}`} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Descripción</label>
                <textarea value={taskEditForm.description} onChange={(e) => setTaskEditForm((f) => ({ ...f, description: e.target.value }))} rows={2} disabled={!canEditField} className={`w-full rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${!canEditField ? "opacity-60 cursor-not-allowed" : ""}`} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Asignar a</label>
                <CustomSelect
                  value={taskEditForm.assigneeId}
                  onChange={(val) => setTaskEditForm((f) => ({ ...f, assigneeId: val }))}
                  options={[{ value: "", label: "Sin asignar" }, ...(isAdmin ? users : users.filter((u) => u.id === user?.id)).map((u) => ({ value: u.id, label: u.name }))]}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Fecha límite</label>
                  <input type="date" min={today} value={taskEditForm.dueDate} onChange={(e) => setTaskEditForm((f) => ({ ...f, dueDate: e.target.value }))} disabled={!canEditField} className={`w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${!canEditField ? "opacity-60 cursor-not-allowed" : ""}`} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Progreso</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={0} max={100} value={taskEditForm.progress} onChange={(e) => setTaskEditForm((f) => ({ ...f, progress: Number(e.target.value) }))} disabled={!canEditProgress} className={`flex-1 accent-indigo-600 ${!canEditProgress ? "opacity-60 cursor-not-allowed" : ""}`} />
                    <span className="w-10 text-right text-sm font-semibold text-indigo-600 dark:text-indigo-400">{taskEditForm.progress}%</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Prioridad</label>
                  <CustomSelect
                    value={taskEditForm.priority}
                    onChange={(val) => setTaskEditForm((f) => ({ ...f, priority: val }))}
                    options={PRIORITIES}
                    disabled={!canEditField}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Estado</label>
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
                <button type="button" onClick={cancelEditTask} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-indigo-400 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(95,150,249,0.4)] disabled:opacity-60 transition-all">{saving ? "Guardando..." : "Guardar"}</button>
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
          if (filterKey) {
            const q = filterKey.toLowerCase();
            if (!parsed.key.toLowerCase().includes(q) && !parsed.id.toLowerCase().includes(q) && !t.title.toLowerCase().includes(q)) return false;
          }
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

        const hasActiveFilters = filterKey || filterType || filterStatus || filterAssign;

        return (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tareas del proyecto ({tasks.length})</h2>
            {hasActiveFilters && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Mostrando {sortedTasks.length} de {tasks.length}
              </span>
            )}
          </div>

          {sortedTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No se encontraron tareas con los filtros aplicados</p>
          ) : sortedTasks.map((t) => {
            const canEditTask = isAdmin || role === "MEMBER";
            const colObj = columnsMap.get(getTaskColumnKey(t));
            const colColor = colObj?.color || "#94a3b8";
            return (
              <div key={t.id} className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 shadow-sm transition hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer" onClick={() => setSelectedTask(t)}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: colColor + "20", color: colColor }}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 truncate">{t.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {t.assignee?.name ? t.assignee.name : "Sin asignar"}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0"
                  style={{ backgroundColor: colColor + "18", color: colColor }}
                >
                  {statusLabelForTask(t)}
                </span>
                {canEditTask && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); startEditTask(t); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); startEditTask(t); } }}
                    className="rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Editar
                  </span>
                )}
                {isAdmin && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, task: t }); setDeleteError(""); }}
                    onKeyDown={(e) => { if (e.key !== "Enter") return; e.stopPropagation(); setDeleteConfirm({ open: true, task: t }); setDeleteError(""); }}
                    className="rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-1.5 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar tarea"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </span>
                )}
                <svg className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
              </div>
            );
          })}
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
