import React, { useMemo, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/http";

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
      <td className="px-5 py-3">
        <div>
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{task.title}</span>
          {task.description && (
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 line-clamp-1">{task.description}</p>
          )}
        </div>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-[10px] font-bold text-white">
            {assigneeName.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm text-slate-700 dark:text-slate-200">{assigneeName}</span>
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
      <td className="px-5 py-3">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {due ? new Date(due).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "—"}
        </span>
      </td>
    </tr>
  );
}

function Section({ variant, items }) {
  const { title, accent, headerBg, border } = sectionConfig[variant] || sectionConfig.next_week;

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
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="px-5 py-2.5">Tarea</th>
                <th className="px-5 py-2.5">Responsable</th>
                <th className="px-5 py-2.5">Estado</th>
                <th className="px-5 py-2.5">Prioridad</th>
                <th className="px-5 py-2.5">Progreso</th>
                <th className="px-5 py-2.5">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
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
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ priority: "", status: "", assignee: "" });

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Resumen semanal del proyecto
        </p>
        <Link
          to={`/projects/${id}`}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          Proyecto
        </Link>
      </div>

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
