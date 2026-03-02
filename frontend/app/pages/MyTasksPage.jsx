import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/http";

const statusLabel = {
  backlog: "Backlog",
  in_progress: "En proceso",
  review: "En revisión",
  done: "Finalizado",
};

const priorityLabel = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mis tareas</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tareas asignadas a ti. Entra al Kanban del proyecto para moverlas o editarlas.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Cargando...
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center shadow-sm">
          <p className="text-slate-500 dark:text-slate-400">No tienes tareas asignadas.</p>
          <Link
            to="/projects"
            className="mt-3 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
          >
            Ver proyectos
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80">
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Tarea</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Proyecto</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Estado</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Prioridad</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Progreso</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Vence</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const status = (t.status || "").toLowerCase();
                  const priority = (t.priority || "medium").toLowerCase();
                  const due = t.dueDate || t.due_date;
                  const project = t.project;
                  return (
                    <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{t.title}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {project?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                          {statusLabel[status] ?? status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {priorityLabel[priority] ?? priority}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div
                              className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                              style={{ width: `${Math.min(100, Math.max(0, Number(t.progress) || 0))}%` }}
                            />
                          </div>
                          <span className="text-slate-600 dark:text-slate-300">{(t.progress ?? 0)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {due ? new Date(due).toLocaleDateString("es-ES") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {project?.id && (
                          <Link
                            to={`/projects/${project.id}/kanban`}
                            className="rounded-lg bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-400"
                          >
                            Abrir Kanban
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
