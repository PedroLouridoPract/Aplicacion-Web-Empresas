import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiFetch } from "../api/http";
import TaskDetailPopup from "../components/TaskDetailPopup";

const statusLabel = {
  backlog: "Backlog",
  in_progress: "En proceso",
  review: "En revisión",
  done: "Finalizado",
};

const priorityConfig = {
  high: { label: "Alta", bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  medium: { label: "Media", bg: "bg-indigo-50 dark:bg-indigo-400/10", text: "text-indigo-700 dark:text-indigo-400", dot: "bg-indigo-400" },
  low: { label: "Baja", bg: "bg-slate-50 dark:bg-slate-700", text: "text-slate-600 dark:text-slate-300", dot: "bg-slate-400" },
};

const statusConfig = {
  backlog: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
  in_progress: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  review: "bg-indigo-50 dark:bg-indigo-400/10 text-indigo-700 dark:text-indigo-400",
  done: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

const DetailIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="7" y1="8" x2="17" y2="8" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <line x1="7" y1="16" x2="13" y2="16" />
  </svg>
);

const KanbanIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
    <rect x="4.5" y="5.5" width="3" height="4" rx="0.5" fill="currentColor" strokeWidth="0" />
    <rect x="4.5" y="11" width="3" height="3" rx="0.5" fill="currentColor" strokeWidth="0" />
    <rect x="10.5" y="5.5" width="3" height="3" rx="0.5" fill="currentColor" strokeWidth="0" />
    <rect x="10.5" y="10" width="3" height="4.5" rx="0.5" fill="currentColor" strokeWidth="0" />
    <rect x="16.5" y="5.5" width="3" height="5" rx="0.5" fill="currentColor" strokeWidth="0" />
  </svg>
);

const TableIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const NAV_TABS = [
  { key: "detail", path: (pid) => `/projects/${pid}`, icon: DetailIcon, title: "Detalles" },
  { key: "kanban", path: (pid) => `/projects/${pid}/kanban`, icon: KanbanIcon, title: "Kanban" },
  { key: "executive", path: (pid) => `/projects/${pid}/executive`, icon: TableIcon, title: "Tabla ejecutiva" },
  { key: "calendar", path: (pid) => `/projects/${pid}/calendar`, icon: CalendarIcon, title: "Calendario" },
];

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);
  const location = useLocation();

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

  useEffect(() => {
    const openTaskId = location.state?.openTaskId;
    if (openTaskId && tasks.length > 0) {
      const found = tasks.find((t) => t.id === openTaskId);
      if (found) {
        setSelectedTask(found);
        window.history.replaceState({}, "");
      } else {
        apiFetch(`/tasks/${openTaskId}`)
          .then((t) => { setSelectedTask(t); window.history.replaceState({}, ""); })
          .catch(() => {});
      }
    }
  }, [location.state?.openTaskId, tasks]);

  const filteredTasks = filter === "all" ? tasks : tasks.filter(t => (t.priority || "medium").toLowerCase() === filter);

  function buildFilterQS(t) {
    return `?priority=${(t.priority || "").toUpperCase()}&assignee=${t.assigneeId || t.assignee?.id || ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div />
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
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-300"
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
                    <tr
                      key={t.id}
                      className="border-b border-slate-50 transition hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30 cursor-pointer"
                      onClick={() => setSelectedTask(t)}
                    >
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
                              className="h-full rounded-full bg-indigo-400 dark:bg-indigo-400"
                              style={{ width: `${Math.min(100, Math.max(0, Number(t.progress) || 0))}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{(t.progress ?? 0)}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {due ? new Date(due).toLocaleDateString("es-ES") : "—"}
                      </td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        {project?.id && (
                          <div className="flex items-center gap-1">
                            {NAV_TABS.map((tab) => {
                              const Icon = tab.icon;
                              return (
                                <Link
                                  key={tab.key}
                                  to={tab.path(project.id) + buildFilterQS(t)}
                                  title={tab.title}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-400/10 dark:hover:text-indigo-400"
                                >
                                  <Icon />
                                </Link>
                              );
                            })}
                          </div>
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

      {selectedTask && (
        <TaskDetailPopup
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
