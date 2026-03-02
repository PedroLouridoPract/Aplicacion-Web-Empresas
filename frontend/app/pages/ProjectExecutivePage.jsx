import React, { useMemo, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/http";

const sectionConfig = {
  overdue: { title: "Atrasadas", className: "border-red-200/80", accent: "bg-red-500", headerBg: "bg-red-50/60" },
  this_week: { title: "Esta semana", className: "border-amber-200/80", accent: "bg-amber-500", headerBg: "bg-amber-50/60" },
  next_week: { title: "Proxima semana", className: "border-slate-200", accent: "bg-slate-400", headerBg: "bg-slate-50/60" },
};

const statusStyles = {
  backlog: { label: "Backlog", bg: "bg-slate-100", text: "text-slate-700" },
  in_progress: { label: "En proceso", bg: "bg-blue-100", text: "text-blue-800" },
  review: { label: "En revision", bg: "bg-violet-100", text: "text-violet-800" },
  done: { label: "Finalizado", bg: "bg-emerald-100", text: "text-emerald-800" },
};

const priorityStyles = {
  high: { label: "Alta", bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" },
  medium: { label: "Media", bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  low: { label: "Baja", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
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
  { value: "review", label: "En revision" },
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
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition">
      <td className="px-4 py-3">
        <div>
          <span className="font-medium text-slate-800">{task.title}</span>
          {task.description && (
            <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{task.description}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
            {assigneeName.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm text-slate-700">{assigneeName}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${priority.dot}`} />
          <span className={`text-xs font-medium ${priority.text}`}>{priority.label}</span>
        </div>
      </td>
      <td className="px-4 py-3 min-w-[120px]">
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                progress === 100 ? "bg-emerald-500" : progress >= 50 ? "bg-indigo-500" : "bg-amber-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-600 w-8 text-right">{progress}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-600">
          {due ? new Date(due).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "—"}
        </span>
      </td>
    </tr>
  );
}

function Section({ variant, items }) {
  const { title, className, accent, headerBg } = sectionConfig[variant] || sectionConfig.next_week;

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${className}`}>
      <div className={`flex items-center gap-2 px-5 py-3 ${headerBg}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <span className="ml-auto rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-600 shadow-sm">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="bg-white px-5 py-8 text-center text-sm text-slate-400">
          Sin tareas en esta seccion
        </div>
      ) : (
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Tarea</th>
                <th className="px-4 py-2.5">Responsable</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5">Prioridad</th>
                <th className="px-4 py-2.5">Progreso</th>
                <th className="px-4 py-2.5">Fecha</th>
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
    if (!data) return { overdue: [], this_week: [], next_week: [] };
    return {
      overdue: filterTasks(data.overdue || [], filters),
      this_week: filterTasks(data.this_week || [], filters),
      next_week: filterTasks(data.next_week || [], filters),
    };
  }, [data, filters]);

  const totalFiltered = filtered.overdue.length + filtered.this_week.length + filtered.next_week.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tabla ejecutiva</h1>
          <p className="mt-1 text-sm text-slate-500">
            Resumen semanal del proyecto — ideal para reuniones
          </p>
        </div>
        <Link
          to={`/projects/${id}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          ← Proyecto
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <span className="text-sm font-medium text-slate-600">Filtros:</span>
        <select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filters.assignee}
          onChange={(e) => setFilters((f) => ({ ...f, assignee: e.target.value }))}
          className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
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
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Limpiar
        </button>
        <span className="ml-auto text-xs text-slate-400">{totalFiltered} tareas</span>
      </div>

      {loading && (
        <div className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm border border-slate-200/80">
          Cargando...
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {data && (
        <div className="grid gap-6">
          <Section variant="overdue" items={filtered.overdue} />
          <Section variant="this_week" items={filtered.this_week} />
          <Section variant="next_week" items={filtered.next_week} />
        </div>
      )}
    </div>
  );
}
