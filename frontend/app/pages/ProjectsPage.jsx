import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";

const PROJECT_STATUSES = [
  { value: "ACTIVE", label: "Activo" },
  { value: "PAUSED", label: "Pausado" },
  { value: "COMPLETED", label: "Finalizado" },
];

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
      await load();
    } catch (err) {
      alert(err.message || "Error creando proyecto");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Proyectos</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Crea y gestiona tus proyectos</p>
      </div>

      {isAdmin && (
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Nuevo proyecto</h2>
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
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
              className="w-full max-w-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-fit rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:shadow-indigo-500/30"
          >
            Crear proyecto
          </button>
        </form>
      </div>
      )}

      {loading && (
        <div className="rounded-xl bg-white dark:bg-slate-800 px-5 py-4 text-sm text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200/80 dark:border-slate-700">
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
            className="group flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/20"
          >
            <div className="h-1 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <Link to={`/projects/${p.id}`} className="mt-4 font-semibold text-slate-800 dark:text-slate-100 hover:text-indigo-600">
              {p.name}
            </Link>
            <p className="mt-1 flex-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{p.description || "—"}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {p.startDate && (
                <span>Inicio: {new Date(p.startDate).toLocaleDateString("es-ES")}</span>
              )}
              {p.endDate && (
                <span>Fin: {new Date(p.endDate).toLocaleDateString("es-ES")}</span>
              )}
              <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 font-medium text-slate-600 dark:text-slate-300">
                {p.status === "ACTIVE" ? "Activo" : p.status === "PAUSED" ? "Pausado" : p.status === "COMPLETED" ? "Finalizado" : p.status ?? "—"}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to={`/projects/${p.id}`}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                Ver / Editar
              </Link>
              <Link
                to={`/projects/${p.id}/kanban`}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Kanban
              </Link>
              <Link
                to={`/projects/${p.id}/executive`}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Tabla ejecutiva
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
