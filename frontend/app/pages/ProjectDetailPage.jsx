import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/http";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setError("");
      setLoading(true);
      try {
        const data = await apiFetch(`/projects/${id}`);
        setProject(data);
      } catch (err) {
        setError(err.message || "Error cargando proyecto");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm border border-slate-200/80">
        Cargando...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/projects" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← Volver a proyectos
        </Link>
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "Proyecto no encontrado"}
        </div>
      </div>
    );
  }

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("es-ES") : "-");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Detalle del proyecto</p>
        </div>
        <Link
          to="/projects"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          ← Proyectos
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        {project.description && (
          <p className="text-slate-600 whitespace-pre-wrap">{project.description}</p>
        )}
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Inicio</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{formatDate(project.start_date)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Fin</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{formatDate(project.end_date)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Estado</dt>
            <dd className="mt-0.5">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-700">
                {project.status ?? "—"}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to={`/projects/${id}/kanban`}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700"
        >
          Ver Kanban
        </Link>
        <Link
          to={`/projects/${id}/executive`}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Tabla ejecutiva
        </Link>
      </div>
    </div>
  );
}
