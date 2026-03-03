import React, { useMemo, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import Avatar from "../components/Avatar";

const TASK_PRIORITIES = [
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Media" },
  { value: "LOW", label: "Baja" },
];

const sectionConfig = {
  overdue: { title: "Atrasadas", accent: "bg-red-500", headerBg: "bg-red-50/60 dark:bg-red-500/10", border: "border-red-200/60 dark:border-red-500/20" },
  this_week: { title: "Esta semana", accent: "bg-amber-500", headerBg: "bg-amber-50/60 dark:bg-amber-500/10", border: "border-amber-200/60 dark:border-amber-500/20" },
  next_week: { title: "Próxima semana", accent: "bg-slate-400", headerBg: "bg-slate-50/60 dark:bg-slate-800/60", border: "border-slate-200 dark:border-slate-700" },
  later: { title: "A un mes o más", accent: "bg-cyan-500", headerBg: "bg-cyan-50/60 dark:bg-cyan-500/10", border: "border-cyan-200/60 dark:border-cyan-500/20" },
  unscheduled: { title: "Sin fecha", accent: "bg-indigo-400", headerBg: "bg-indigo-50/60 dark:bg-indigo-500/10", border: "border-indigo-200/60 dark:border-indigo-500/20" },
};

const statusStyles = {
  backlog: { label: "Backlog", cls: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300" },
  in_progress: { label: "En proceso", cls: "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
  review: { label: "En revisión", cls: "bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  done: { label: "Finalizado", cls: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};

const priorityStyles = {
  high: { label: "Alta", text: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
  medium: { label: "Media", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  low: { label: "Baja", text: "text-slate-500 dark:text-slate-400", dot: "bg-slate-400" },
};

const PRIORITY_OPTIONS = [
  { value: "", label: "Todas las prioridades" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "backlog", label: "Backlog" },
  { value: "in_progress", label: "En proceso" },
  { value: "review", label: "En revisión" },
  { value: "done", label: "Finalizado" },
];

function filterTasks(tasks, filters) {
  if (!tasks) return [];
  return tasks.filter((t) => {
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.assignee === "unassigned" && t.assignee_id != null) return false;
    if (filters.assignee && filters.assignee !== "unassigned" && String(t.assignee_id ?? t.assigneeId ?? "") !== String(filters.assignee)) return false;
    return true;
  });
}

function TaskRow({ task }) {
  const status = statusStyles[(task.status || "").toLowerCase()] || statusStyles.backlog;
  const priority = priorityStyles[(task.priority || "").toLowerCase()] || priorityStyles.medium;
  const progress = Math.min(100, Math.max(0, Number(task.progress) || 0));
  const due = task.due_date || task.dueDate;
  const assigneeName = task.assignee?.name ?? "Sin asignar";

  return (
    <tr className="border-b border-slate-50 transition hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30">
      <td className="px-5 py-3 overflow-hidden">
        <div className="min-w-0">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate block">{task.title}</span>
          {task.description && (
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 truncate">{task.description}</p>
          )}
        </div>
      </td>
      <td className="px-5 py-3 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={assigneeName} src={task.assignee?.avatarUrl} size="xs" />
          <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{assigneeName}</span>
        </div>
      </td>
      <td className="px-5 py-3">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${status.cls}`}>
          {status.label}
        </span>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} />
          <span className={`text-xs font-medium ${priority.text}`}>{priority.label}</span>
        </div>
      </td>
      <td className="px-5 py-3 min-w-[120px]">
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all ${
                progress === 100 ? "bg-emerald-500" : progress >= 50 ? "bg-indigo-500" : "bg-amber-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-8 text-right">{progress}%</span>
        </div>
      </td>
      <td className="px-5 py-3 overflow-hidden">
        <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {due ? new Date(due).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
        </span>
      </td>
    </tr>
  );
}

const SORT_COLUMNS = [
  { key: "title", label: "Tarea" },
  { key: "assignee", label: "Responsable" },
  { key: "status", label: "Estado" },
  { key: "priority", label: "Prioridad" },
  { key: "progress", label: "Progreso" },
  { key: "date", label: "Fecha" },
];

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const STATUS_ORDER = { DONE: 0, REVIEW: 1, IN_PROGRESS: 2, BACKLOG: 3 };

function sortItems(items, sortKey, sortDir) {
  if (!sortKey) return items;
  const dir = sortDir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    let av, bv;
    switch (sortKey) {
      case "title":
        av = (a.title || "").toLowerCase();
        bv = (b.title || "").toLowerCase();
        return av.localeCompare(bv) * dir;
      case "assignee":
        av = (a.assignee?.name || "zzz").toLowerCase();
        bv = (b.assignee?.name || "zzz").toLowerCase();
        return av.localeCompare(bv) * dir;
      case "status":
        av = STATUS_ORDER[(a.status || "").toUpperCase()] ?? 9;
        bv = STATUS_ORDER[(b.status || "").toUpperCase()] ?? 9;
        return (av - bv) * dir;
      case "priority":
        av = PRIORITY_ORDER[(a.priority || "").toUpperCase()] ?? 9;
        bv = PRIORITY_ORDER[(b.priority || "").toUpperCase()] ?? 9;
        return (av - bv) * dir;
      case "progress":
        av = Number(a.progress) || 0;
        bv = Number(b.progress) || 0;
        return (av - bv) * dir;
      case "date":
        av = new Date(a.due_date || a.dueDate || 0).getTime();
        bv = new Date(b.due_date || b.dueDate || 0).getTime();
        return (av - bv) * dir;
      default:
        return 0;
    }
  });
}

function SortArrow({ active, dir }) {
  if (!active) return <svg className="ml-1 h-3 w-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
  return dir === "asc"
    ? <svg className="ml-1 h-3 w-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
    : <svg className="ml-1 h-3 w-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
}

function Section({ variant, items }) {
  const { title, accent, headerBg, border } = sectionConfig[variant] || sectionConfig.next_week;
  const [sortKey, setSortKey] = React.useState(null);
  const [sortDir, setSortDir] = React.useState("asc");

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = React.useMemo(() => sortItems(items, sortKey, sortDir), [items, sortKey, sortDir]);

  return (
    <div className={`overflow-hidden rounded-xl border ${border}`}>
      <div className={`flex items-center gap-2 px-5 py-3 ${headerBg}`}>
        <span className={`h-2 w-2 rounded-full ${accent}`} />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        <span className="ml-auto rounded-full bg-white/80 dark:bg-slate-700/80 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          Sin tareas en esta sección
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-slate-800">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[35%]" />
              <col className="w-[16%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                {SORT_COLUMNS.map(({ key, label }) => (
                  <th
                    key={key}
                    className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 cursor-pointer select-none transition hover:text-indigo-600 dark:hover:text-indigo-400"
                    onClick={() => handleSort(key)}
                  >
                    <span className="inline-flex items-center">
                      {label}
                      <SortArrow active={sortKey === key} dir={sortDir} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ProjectExecutivePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ priority: "", status: "", assignee: "" });
  const [showNewTask, setShowNewTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assigneeId: "", dueDate: "", priority: "MEDIUM" });
  const [taskError, setTaskError] = useState("");
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function reload() {
    try {
      const execRes = await apiFetch(`/projects/${id}/executive`);
      setData(execRes);
    } catch {}
  }

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
      await reload();
    } catch (err) {
      setTaskError(err.message || "Error al crear la tarea");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    async function load() {
      setError("");
      setLoading(true);
      try {
        const [execRes, usersRes] = await Promise.all([
          apiFetch(`/projects/${id}/executive`),
          apiFetch("/users").catch(() => []),
        ]);
        setData(execRes);
        setUsers(Array.isArray(usersRes) ? usersRes : (usersRes?.users ?? []));
      } catch (err) {
        setError(err.message || "Error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const filtered = useMemo(() => {
    if (!data) return { overdue: [], this_week: [], next_week: [], later: [], unscheduled: [] };
    return {
      overdue: filterTasks(data.overdue || [], filters),
      this_week: filterTasks(data.this_week || [], filters),
      next_week: filterTasks(data.next_week || [], filters),
      later: filterTasks(data.later || [], filters),
      unscheduled: filterTasks(data.unscheduled || [], filters),
    };
  }, [data, filters]);

  const totalFiltered = filtered.overdue.length + filtered.this_week.length + filtered.next_week.length + filtered.later.length + filtered.unscheduled.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to={`/projects/${id}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 transition hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tabla Ejecutiva</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Resumen semanal del proyecto</p>
          </div>
        </div>
        <button type="button" onClick={() => { setShowNewTask(true); setTaskError(""); }} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">+ Nueva tarea</button>
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

      <div className="content-card flex flex-wrap items-center gap-3 p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Filtros</span>
        <select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filters.assignee}
          onChange={(e) => setFilters((f) => ({ ...f, assignee: e.target.value }))}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Cualquier responsable</option>
          <option value="unassigned">Sin asignar</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setFilters({ priority: "", status: "", assignee: "" })}
          className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          Limpiar
        </button>
        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{totalFiltered} tareas</span>
      </div>

      {loading && (
        <div className="content-card px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Cargando...
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      {data && (
        <div className="grid gap-5">
          <Section variant="overdue" items={filtered.overdue} />
          <Section variant="this_week" items={filtered.this_week} />
          <Section variant="next_week" items={filtered.next_week} />
          <Section variant="later" items={filtered.later} />
          <Section variant="unscheduled" items={filtered.unscheduled} />
        </div>
      )}
    </div>
  );
}
