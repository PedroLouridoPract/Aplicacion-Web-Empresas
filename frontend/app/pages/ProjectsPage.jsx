import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";

const PROJECT_STATUSES = [
  { value: "ACTIVE", label: "Activo" },
  { value: "PAUSED", label: "Pausado" },
  { value: "COMPLETED", label: "Finalizado" },
];

const statusBadge = {
  ACTIVE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  PAUSED: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  COMPLETED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const role = (user?.role && String(user.role).toUpperCase()) || "";
  const isAdmin = role === "ADMIN";

  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/projects");
      setProjects(Array.isArray(data) ? data : (data?.projects ?? []));
    } catch (err) {
      setError(err.message || "Error cargando proyectos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createProject(e) {
    e.preventDefault();
    try {
      await apiFetch("/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || null,
          startDate: startDate || null,
          endDate: endDate || null,
          status,
        }),
      });
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setStatus("ACTIVE");
      setShowCreate(false);
      await load();
    } catch (err) {
      alert(err.message || "Error creando proyecto");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">Crea y gestiona tus proyectos</p>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            + Nuevo proyecto
          </button>
        )}
      </div>

      {showCreate && isAdmin && (
        <div className="content-card p-6">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Nuevo proyecto</h2>
          <form onSubmit={createProject} className="mt-4 flex max-w-lg flex-col gap-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Nombre
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del proyecto"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Descripción
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del proyecto"
                rows={3}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="startDate" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Fecha inicio
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Fecha fin
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div>
              <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Estado
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                Crear proyecto
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && (
        <div className="content-card px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Cargando...
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(Array.isArray(projects) ? projects : []).map((p) => (
          <div
            key={p.id}
            className="content-card group flex flex-col p-5 transition hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/20"
          >
            <div className="flex items-start justify-between gap-3">
              <Link to={`/projects/${p.id}`} className="font-semibold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400">
                {p.name}
              </Link>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[p.status] || statusBadge.ACTIVE}`}>
                {p.status === "ACTIVE" ? "Activo" : p.status === "PAUSED" ? "Pausado" : p.status === "COMPLETED" ? "Finalizado" : p.status ?? "—"}
              </span>
            </div>
            <p className="mt-2 flex-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{p.description || "Sin descripción"}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
              {p.startDate && (
                <span>Inicio: {new Date(p.startDate).toLocaleDateString("es-ES")}</span>
              )}
              {p.endDate && (
                <span>Fin: {new Date(p.endDate).toLocaleDateString("es-ES")}</span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
              <Link
                to={`/projects/${p.id}`}
                className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
              >
                Ver detalle
              </Link>
              <Link
                to={`/projects/${p.id}/kanban`}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Kanban
              </Link>
              <Link
                to={`/projects/${p.id}/executive`}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Ejecutiva
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
