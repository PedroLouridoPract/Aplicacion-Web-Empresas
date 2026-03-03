import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/http";

const statusLabel = {
  backlog: "Backlog",
  in_progress: "En proceso",
  review: "En revisión",
  done: "Finalizado",
};

const priorityConfig = {
  high: { label: "Alta", bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  medium: { label: "Media", bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-400", dot: "bg-indigo-500" },
  low: { label: "Baja", bg: "bg-slate-50 dark:bg-slate-700", text: "text-slate-600 dark:text-slate-300", dot: "bg-slate-400" },
};

const statusConfig = {
  backlog: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
  in_progress: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  review: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  done: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

function getDayOfWeek(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "");
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function load() {
      setError("");
      setLoading(true);
      try {
        const data = await apiFetch("/tasks/mine");
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Error cargando tus tareas");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredTasks = filter === "all" ? tasks : tasks.filter(t => (t.priority || "medium").toLowerCase() === filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tareas asignadas a ti
        </p>
        <div className="flex gap-2">
          {[
            { key: "all", label: "Todas" },
            { key: "high", label: "Alta prioridad" },
            { key: "medium", label: "Media prioridad" },
            { key: "low", label: "Baja prioridad" },
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === f.key
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="content-card px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Cargando...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="content-card p-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            {filter === "all" ? "No tienes tareas asignadas." : "No hay tareas con esta prioridad."}
          </p>
          <Link
            to="/projects"
            className="mt-3 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
          >
            Ver proyectos
          </Link>
        </div>
      ) : (
        <div className="content-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tarea</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Proyecto</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Estado</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Prioridad</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Progreso</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Vence</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => {
                  const status = (t.status || "").toLowerCase();
                  const priority = (t.priority || "medium").toLowerCase();
                  const due = t.dueDate || t.due_date;
                  const project = t.project;
                  const pCfg = priorityConfig[priority] || priorityConfig.medium;
                  const sCfg = statusConfig[status] || statusConfig.backlog;
                  return (
                    <tr key={t.id} className="border-b border-slate-50 transition hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{t.title}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {project?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${sCfg}`}>
                          {statusLabel[status] ?? status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${pCfg.bg} ${pCfg.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${pCfg.dot}`} />
                          {pCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div
                              className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                              style={{ width: `${Math.min(100, Math.max(0, Number(t.progress) || 0))}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{(t.progress ?? 0)}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {due ? new Date(due).toLocaleDateString("es-ES") : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {project?.id && (
                          <Link
                            to={`/projects/${project.id}/kanban?priority=${(t.priority || "").toUpperCase()}&assignee=${t.assigneeId || t.assignee?.id || ""}`}
                            className="rounded-lg bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 dark:hover:bg-indigo-400"
                          >
                            Kanban
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
