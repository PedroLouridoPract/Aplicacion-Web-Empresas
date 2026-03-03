import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import ProjectNavButtons, { NewTaskButton, ProjectLoadingSpinner, useStickyCompact, stickyTransition } from "../components/ProjectNavButtons";

const TASK_PRIORITIES = [
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Media" },
  { value: "LOW", label: "Baja" },
];

const PRIORITY_STYLES = {
  HIGH: {
    bg: "bg-indigo-100 dark:bg-indigo-500/20",
    border: "border-indigo-300 dark:border-indigo-500/40",
    text: "text-indigo-800 dark:text-indigo-200",
    dot: "bg-indigo-500",
    label: "Alta prioridad",
    btnActive: "bg-indigo-600 text-white",
    btnInactive: "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  MEDIUM: {
    bg: "bg-sky-50 dark:bg-sky-500/15",
    border: "border-sky-200 dark:border-sky-500/30",
    text: "text-sky-800 dark:text-sky-200",
    dot: "bg-sky-500",
    label: "Media prioridad",
    btnActive: "bg-sky-500 text-white",
    btnInactive: "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  LOW: {
    bg: "bg-slate-50 dark:bg-slate-700/50",
    border: "border-slate-200 dark:border-slate-600",
    text: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-400",
    label: "Baja prioridad",
    btnActive: "bg-slate-500 text-white",
    btnInactive: "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
};

const DAY_NAMES = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatWeekRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const opts = { day: "numeric", month: "long" };
  const m = monday.toLocaleDateString("es-ES", opts);
  const s = sunday.toLocaleDateString("es-ES", { ...opts, year: "numeric" });
  return `${m} – ${s}`;
}

export default function ProjectCalendarPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { sentinelRef, compact } = useStickyCompact();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assigneeId: "", dueDate: "", priority: "MEDIUM" });
  const [taskError, setTaskError] = useState("");
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/projects/${id}/tasks`),
      apiFetch("/users").catch(() => []),
    ])
      .then(([tasksRes, usersRes]) => {
        setTasks(Array.isArray(tasksRes) ? tasksRes : []);
        setUsers(Array.isArray(usersRes) ? usersRes : (usersRes?.users ?? []));
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCreateTask(e) {
    e.preventDefault();
    setTaskError("");
    setSaving(true);
    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({ projectId: id, title: taskForm.title.trim(), description: taskForm.description.trim() || null, assigneeId: taskForm.assigneeId || null, dueDate: taskForm.dueDate || null, priority: taskForm.priority }),
      });
      setTaskForm({ title: "", description: "", assigneeId: "", dueDate: "", priority: "MEDIUM" });
      setShowNewTask(false);
      const res = await apiFetch(`/projects/${id}/tasks`);
      setTasks(Array.isArray(res) ? res : []);
    } catch (err) {
      setTaskError(err.message || "Error al crear la tarea");
    } finally {
      setSaving(false);
    }
  }

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const tasksByDay = useMemo(() => {
    const map = {};
    weekDays.forEach((d) => {
      map[d.toDateString()] = [];
    });

    let filtered = tasks;
    if (priorityFilter) filtered = filtered.filter((t) => (t.priority || "").toUpperCase() === priorityFilter);
    if (assigneeFilter) filtered = filtered.filter((t) => String(t.assigneeId || t.assignee?.id || "") === assigneeFilter);

    filtered.forEach((t) => {
      const dateStr = t.dueDate || t.due_date || t.createdAt;
      if (!dateStr) return;
      const taskDate = new Date(dateStr);
      const key = taskDate.toDateString();
      if (map[key]) {
        map[key].push(t);
      }
    });

    return map;
  }, [tasks, weekDays, priorityFilter, assigneeFilter]);

  const todayDate = new Date();

  function prevWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function nextWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  function goToday() {
    setWeekStart(getMonday(new Date()));
  }

  const statusLabel = (s) => {
    const map = { BACKLOG: "Backlog", IN_PROGRESS: "En proceso", REVIEW: "En revisión", DONE: "Finalizado" };
    return map[(s || "").toUpperCase()] || s || "";
  };

  const statusColor = (s) => {
    const map = {
      BACKLOG: "text-slate-400",
      IN_PROGRESS: "text-blue-500",
      REVIEW: "text-amber-500",
      DONE: "text-emerald-500",
    };
    return map[(s || "").toUpperCase()] || "text-slate-400";
  };

  return (
    <div className="flex flex-col gap-6">
      <div ref={sentinelRef} className="h-px w-full -mb-px" />
      <div className={`sticky top-0 z-30 ${compact ? "bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm -mx-6 px-6 py-3 shadow-sm border-b border-slate-200/60 dark:border-slate-700/60" : "flex flex-col gap-3"}`} style={stickyTransition.wrapper(compact)}>
        <div className="flex flex-wrap items-center gap-3" style={stickyTransition.navRow(compact)}>
          <Link to={`/projects/${id}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 transition hover:bg-slate-50 dark:hover:bg-slate-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="mr-auto">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Calendario</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Resumen de tareas de la semana</p>
          </div>
          <ProjectNavButtons projectId={id} current="calendar" />
          <NewTaskButton onClick={() => { setShowNewTask(true); setTaskError(""); }} />
        </div>

        <div className={`flex flex-wrap items-center gap-3 ${compact ? "" : "content-card p-4"}`}>
          <Link to={`/projects/${id}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 transition hover:bg-slate-50 dark:hover:bg-slate-700" style={stickyTransition.compactItems(compact)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Filtros</span>
          {Object.entries(PRIORITY_STYLES).map(([key, style]) => (
            <button key={key} type="button" onClick={() => setPriorityFilter(priorityFilter === key ? null : key)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${priorityFilter === key ? style.btnActive : style.btnInactive}`}>{style.label}</button>
          ))}
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20">
            <option value="">Todos los miembros</option>
            {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
          </select>
          {(priorityFilter || assigneeFilter) && (
            <button type="button" onClick={() => { setPriorityFilter(null); setAssigneeFilter(""); }} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200">Limpiar</button>
          )}
          <div className="inline-flex items-center gap-3" style={stickyTransition.compactItems(compact)}>
            <span className="ml-auto" />
            <ProjectNavButtons projectId={id} current="calendar" compact />
            <NewTaskButton onClick={() => { setShowNewTask(true); setTaskError(""); }} compact />
          </div>
        </div>
      </div>

      {showNewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowNewTask(false); setTaskError(""); }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Crear tarea</h3>
              <button type="button" onClick={() => { setShowNewTask(false); setTaskError(""); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Título *</label>
                <input type="text" required value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ej: Revisar maquetas" className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Descripción</label>
                <textarea value={taskForm.description} onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))} placeholder="Opcional" rows={2} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Asignar a</label>
                <select value={taskForm.assigneeId} onChange={(e) => setTaskForm((f) => ({ ...f, assigneeId: e.target.value }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                  <option value="">Sin asignar</option>
                  {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Fecha límite</label>
                  <input type="date" min={today} value={taskForm.dueDate} onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Prioridad</label>
                  <select value={taskForm.priority} onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                    {TASK_PRIORITIES.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                  </select>
                </div>
              </div>
              {taskError && <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{taskError}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowNewTask(false); setTaskError(""); }} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60">{saving ? "Creando..." : "Crear tarea"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Week navigation */}
      <div className="content-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 px-5 py-3">
          <button type="button" onClick={prevWeek} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize">{formatWeekRange(weekStart)}</span>
            <button type="button" onClick={goToday} className="rounded-md bg-indigo-50 dark:bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 transition hover:bg-indigo-100 dark:hover:bg-indigo-500/25">
              Hoy
            </button>
          </div>
          <button type="button" onClick={nextWeek} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {loading ? (
          <ProjectLoadingSpinner />
        ) : (
          <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-700/50">
            {weekDays.map((day, i) => {
              const isToday = sameDay(day, todayDate);
              const dayTasks = tasksByDay[day.toDateString()] || [];
              return (
                <div key={i} className={`min-h-[340px] flex flex-col ${isToday ? "bg-indigo-50/30 dark:bg-indigo-500/5" : ""}`}>
                  {/* Day header */}
                  <div className="flex flex-col items-center py-3 border-b border-slate-100 dark:border-slate-700/50">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{DAY_NAMES[i]}</span>
                    <span className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      isToday
                        ? "bg-indigo-600 text-white"
                        : "text-slate-700 dark:text-slate-200"
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Tasks */}
                  <div className="flex-1 space-y-1.5 p-2">
                    {dayTasks.length === 0 && (
                      <p className="pt-4 text-center text-[10px] text-slate-300 dark:text-slate-600">Sin tareas</p>
                    )}
                    {dayTasks.map((t) => {
                      const prio = (t.priority || "MEDIUM").toUpperCase();
                      const style = PRIORITY_STYLES[prio] || PRIORITY_STYLES.MEDIUM;
                      return (
                        <div
                          key={t.id}
                          className={`rounded-lg border ${style.border} ${style.bg} p-2 transition hover:shadow-sm`}
                        >
                          <p className={`text-xs font-semibold leading-tight ${style.text} line-clamp-2`}>
                            {t.title}
                          </p>
                          {t.assignee?.name && (
                            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              → {t.assignee.name}
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            <span className={`text-[10px] font-medium ${statusColor(t.status)}`}>
                              {statusLabel(t.status)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 px-5 py-2.5">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {tasks.length} tarea{tasks.length !== 1 ? "s" : ""} en total
          </span>
          <Link
            to={`/projects/${id}`}
            className="text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 transition"
          >
            ← Volver al proyecto
          </Link>
        </div>
      </div>
    </div>
  );
}
