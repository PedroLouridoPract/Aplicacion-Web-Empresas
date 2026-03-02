import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import KanbanColumn from "../components/KanbanColumn";
import TaskCard from "../components/TaskCard";

const STATUSES = [
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "En proceso" },
  { key: "review", label: "En revisión" },
  { key: "done", label: "Finalizado" },
];

const PRIORITIES = [
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Media" },
  { value: "LOW", label: "Baja" },
];

const TASK_STATUSES = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "IN_PROGRESS", label: "En proceso" },
  { value: "REVIEW", label: "En revisión" },
  { value: "DONE", label: "Finalizado" },
];

export default function ProjectKanbanPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: "",
    priority: "MEDIUM",
  });
  const [saving, setSaving] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [moveError, setMoveError] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [taskEditForm, setTaskEditForm] = useState(null);
  const [editError, setEditError] = useState("");

  const grouped = useMemo(() => {
    const map = Object.fromEntries(STATUSES.map((s) => [s.key, []]));
    for (const t of tasks) map[t.status]?.push(t);
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    }
    return map;
  }, [tasks]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, usersRes] = await Promise.all([
        apiFetch(`/projects/${id}/tasks`),
        apiFetch("/users").catch(() => []),
      ]);
      setTasks(Array.isArray(tasksRes) ? tasksRes : tasksRes);
      setUsers(Array.isArray(usersRes) ? usersRes : (usersRes?.users ?? []));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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
      await load();
    } catch (err) {
      setTaskError(err.message || "Error al crear la tarea");
    } finally {
      setSaving(false);
    }
  }

  function startEditTask(task) {
    setEditingTask(task);
    setTaskEditForm({
      title: task.title || "",
      description: task.description || "",
      assigneeId: task.assigneeId || task.assignee?.id || "",
      dueDate: task.dueDate || task.due_date ? (task.dueDate || task.due_date).slice(0, 10) : "",
      priority: (task.priority || "MEDIUM").toUpperCase(),
      status: (task.status || "backlog").toUpperCase().replace("-", "_"),
      progress: Number(task.progress) || 0,
    });
    setEditError("");
  }

  async function handleSaveTask(e) {
    e.preventDefault();
    if (!editingTask) return;
    setEditError("");
    setSaving(true);
    try {
      await apiFetch(`/tasks/${editingTask.id}`, {
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
      setEditingTask(null);
      setTaskEditForm(null);
      await load();
    } catch (err) {
      setEditError(err.message || "Error al guardar la tarea");
    } finally {
      setSaving(false);
    }
  }

  const moveTask = useCallback(
    async (taskId, newStatus) => {
      setMoveError("");
      const dest = grouped[newStatus] || [];
      const newOrder =
        dest.length ? (dest[dest.length - 1].order_index ?? dest.length - 1) + 1 : 0;
      try {
        await apiFetch(`/tasks/${taskId}/move`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus, order_index: newOrder }),
        });
        await load();
      } catch (err) {
        setMoveError(err.message || "No puedes mover esta tarea. Solo el responsable o un admin pueden modificarla.");
      }
    },
    [grouped, load]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handleDragStart(ev) {
    setActiveId(ev.active.id);
  }

  function handleDragEnd(ev) {
    const { active, over } = ev;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const taskId = active.id;
    const newStatus = String(over.id);
    if (STATUSES.some((s) => s.key === newStatus)) {
      moveTask(taskId, newStatus);
    }
  }

  const activeTask = activeId ? tasks.find((t) => String(t.id) === activeId) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kanban</h1>
          <p className="mt-1 text-sm text-slate-500">Proyecto {id}</p>
        </div>
        <Link
          to={`/projects/${id}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          ← Proyecto
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Arrastra las tarjetas entre columnas o usa los botones para mover.
        </p>
        <button
          type="button"
          onClick={() => { setShowNewTask(true); setTaskError(""); }}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
        >
          + Nueva tarea
        </button>
      </div>

      {moveError && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 border border-amber-200">
          {moveError}
        </div>
      )}

      {editingTask && taskEditForm && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800">Editar tarea</h3>
          <form onSubmit={handleSaveTask} className="mt-4 flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Título</label>
              <input
                type="text"
                required
                value={taskEditForm.title}
                onChange={(e) => setTaskEditForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full max-w-md rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Descripción</label>
              <textarea
                value={taskEditForm.description}
                onChange={(e) => setTaskEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full max-w-md rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Asignar a</label>
                <select
                  value={taskEditForm.assigneeId}
                  onChange={(e) => setTaskEditForm((f) => ({ ...f, assigneeId: e.target.value }))}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Sin asignar</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Fecha límite</label>
                <input
                  type="date"
                  min={today}
                  value={taskEditForm.dueDate}
                  onChange={(e) => setTaskEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Prioridad</label>
                <select
                  value={taskEditForm.priority}
                  onChange={(e) => setTaskEditForm((f) => ({ ...f, priority: e.target.value }))}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Estado</label>
                <select
                  value={taskEditForm.status}
                  onChange={(e) => setTaskEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Progreso %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={taskEditForm.progress}
                  onChange={(e) => setTaskEditForm((f) => ({ ...f, progress: Number(e.target.value) || 0 }))}
                  className="w-20 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            {editError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</div>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button type="button" onClick={() => { setEditingTask(null); setTaskEditForm(null); setEditError(""); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {showNewTask && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800">Nueva tarea</h3>
          <form onSubmit={handleCreateTask} className="mt-4 flex flex-wrap items-end gap-4">
            <div className="min-w-[200px]">
              <label htmlFor="kanban-task-title" className="mb-1 block text-xs font-medium text-slate-600">Título *</label>
              <input
                id="kanban-task-title"
                type="text"
                required
                value={taskForm.title}
                onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Título de la tarea"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="min-w-[180px]">
              <label htmlFor="kanban-task-assignee" className="mb-1 block text-xs font-medium text-slate-600">Asignar a</label>
              <select
                id="kanban-task-assignee"
                value={taskForm.assigneeId}
                onChange={(e) => setTaskForm((f) => ({ ...f, assigneeId: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Sin asignar</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="kanban-task-due" className="mb-1 block text-xs font-medium text-slate-600">Fecha límite</label>
              <input
                id="kanban-task-due"
                type="date"
                min={today}
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Prioridad</label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
                className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            {taskError && (
              <div className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{taskError}</div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Creando..." : "Crear"}
              </button>
              <button
                type="button"
                onClick={() => { setShowNewTask(false); setTaskError(""); }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm border border-slate-200/80">
          Cargando...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {STATUSES.map((s) => (
              <KanbanColumn
                key={s.key}
                title={s.label}
                statusKey={s.key}
                tasks={grouped[s.key] || []}
                statuses={STATUSES}
                onMove={moveTask}
                activeId={activeId}
                currentUser={user}
                onEditTask={startEditTask}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="rotate-2 scale-105 opacity-90">
                <TaskCard
                  task={activeTask}
                  statuses={STATUSES}
                  onMove={() => {}}
                  isDragging={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
