import React, { useMemo, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/http";

const sectionConfig = {
  overdue: {
    title: "Atrasadas",
    className: "border-red-200/80 bg-red-50/50",
    accent: "bg-red-500",
  },
  this_week: {
    title: "Esta semana",
    className: "border-amber-200/80 bg-amber-50/50",
    accent: "bg-amber-500",
  },
  next_week: {
    title: "Próxima semana",
    className: "border-slate-200 bg-slate-50/50",
    accent: "bg-slate-400",
  },
};

const PRIORITIES = ["high", "medium", "low"];
const STATUSES = ["backlog", "in_progress", "review", "done"];

function filterTasks(tasks, filters) {
  if (!tasks) return [];
  return tasks.filter((t) => {
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.assignee && t.assignee_id != null && String(t.assignee_id) !== String(filters.assignee)) return false;
    if (filters.assignee && t.assignee_id == null && filters.assignee !== "unassigned") return false;
    return true;
  });
}

function Section({ variant, items }) {
  const { title, className, accent } = sectionConfig[variant] || sectionConfig.next_week;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${accent}`} />
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow"
          >
            <p className="font-medium text-slate-800">{t.title}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
              <span>Estado: {t.status}</span>
              <span>Prioridad: {t.priority}</span>
              <span>Progreso: {t.progress}%</span>
              <span>
                Fecha: {t.due_date ? new Date(t.due_date).toLocaleDateString() : "-"}
              </span>
            </div>
          </div>
        ))}
        {!items.length && (
          <p className="py-6 text-center text-sm text-slate-500">Sin tareas</p>
        )}
      </div>
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
        setUsers(Array.isArray(usersRes) ? usersRes : []);
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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tabla ejecutiva</h1>
          <p className="mt-1 text-sm text-slate-500">Proyecto {id}</p>
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
          className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-sm text-slate-800"
        >
          <option value="">Todas las prioridades</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-sm text-slate-800"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filters.assignee}
          onChange={(e) => setFilters((f) => ({ ...f, assignee: e.target.value }))}
          className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-sm text-slate-800"
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
