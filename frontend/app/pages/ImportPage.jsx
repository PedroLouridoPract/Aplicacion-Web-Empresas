import React, { useState, useRef, useCallback } from "react";
import { apiFetch } from "../api/http";

const KNOWN_COLUMNS = {
  "clave de incidencia": "Clave",
  "issue key": "Clave",
  key: "Clave",
  "id de la incidencia": "ID incidencia",
  "issue id": "ID incidencia",
  "tipo de incidencia": "Tipo",
  "issue type": "Tipo",
  resumen: "Resumen",
  summary: "Resumen",
  title: "Resumen",
  titulo: "Resumen",
  "título": "Resumen",
  "nombre del proyecto": "Proyecto",
  "project name": "Proyecto",
  proyecto: "Proyecto",
  project: "Proyecto",
  "responsable del proyecto": "Responsable proyecto",
  "project lead": "Responsable proyecto",
  "descripción": "Descripción",
  description: "Descripción",
  descripcion: "Descripción",
  detalle: "Descripción",
  prioridad: "Prioridad",
  priority: "Prioridad",
  estado: "Estado",
  status: "Estado",
  "categoría de estado": "Categoría estado",
  "status category": "Categoría estado",
  "persona asignada": "Persona asignada",
  assignee: "Persona asignada",
  asignado: "Persona asignada",
  "fecha de vencimiento": "Fecha límite",
  "due date": "Fecha límite",
  duedate: "Fecha límite",
  fecha_limite: "Fecha límite",
  vencimiento: "Fecha límite",
  creador: "Creador",
  creator: "Creador",
  informador: "Informador",
  reporter: "Informador",
  creada: "Fecha creación",
  created: "Fecha creación",
  resuelta: "Fecha resuelta",
  resolved: "Fecha resuelta",
  "fecha de resolución": "Fecha resuelta",
  comentario: "Comentarios",
  comment: "Comentarios",
};

function getColumnLabel(col) {
  return KNOWN_COLUMNS[col.toLowerCase()] || null;
}

function isRelevantColumn(col) {
  return getColumnLabel(col) !== null;
}

export default function ImportPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (f) => {
    setFile(f);
    setResult(null);
    setError("");
    setPreview(null);

    const formData = new FormData();
    formData.append("file", f);

    try {
      const data = await apiFetch("/import/preview", {
        method: "POST",
        body: formData,
      });
      setPreview(data);
    } catch (err) {
      setError(err.message || "Error al leer el archivo CSV");
    }
  }, []);

  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave(e) {
    e.preventDefault();
    setDragging(false);
  }
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }
  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  async function doImport() {
    if (!file) return;
    setImporting(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await apiFetch("/import/tasks", {
        method: "POST",
        body: formData,
      });
      setResult(data);
    } catch (err) {
      setError(err.message || "Error al importar");
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const relevantColumns = preview
    ? preview.columns.filter(isRelevantColumn)
    : [];

  return (
    <div className="flex flex-col gap-6">

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
          dragging
            ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-500/10"
            : file
              ? "border-emerald-400 bg-emerald-50/40 dark:border-emerald-500/50 dark:bg-emerald-500/5"
              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/80"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          className="hidden"
        />

        {file ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/20">
              <svg className="h-7 w-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-medium text-slate-800 dark:text-slate-100">{file.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {(file.size / 1024).toFixed(1)} KB
              {preview && ` · ${preview.totalRows} filas · ${preview.columns.length} columnas`}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="mt-1 text-sm font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
            >
              Quitar archivo
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-500/20">
              <svg className="h-7 w-7 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">
                Arrastra tu archivo CSV aquí
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                o haz clic para seleccionar · Compatible con exportaciones de Jira
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Guía de columnas */}
      {!file && (
        <div className="content-card p-6">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Columnas reconocidas</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            El sistema detecta automáticamente las columnas del CSV. Se requiere <strong>Nombre del proyecto</strong> y al menos <strong>Clave de incidencia</strong> o <strong>Resumen</strong>.
            Si el proyecto o las personas no existen, se crean automáticamente.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-4 text-left font-medium text-slate-600 dark:text-slate-300">Campo</th>
                  <th className="py-2 pr-4 text-left font-medium text-slate-600 dark:text-slate-300">Columnas CSV aceptadas</th>
                  <th className="py-2 text-left font-medium text-slate-600 dark:text-slate-300">Mapeo</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 dark:text-slate-400">
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">Proyecto *</td>
                  <td className="py-2 pr-4"><code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Nombre del proyecto</code></td>
                  <td className="py-2 text-xs text-slate-500">Se crea el proyecto si no existe</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">Nombre tarea</td>
                  <td className="py-2 pr-4"><code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Clave de incidencia + ID + Tipo de Incidencia</code></td>
                  <td className="py-2 text-xs text-slate-500">Ej: KAN-527 · 18862 · Tarea</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">Resumen</td>
                  <td className="py-2 pr-4"><code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Resumen, Summary</code></td>
                  <td className="py-2 text-xs text-slate-500">Se muestra al abrir la tarea</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">Descripción</td>
                  <td className="py-2 pr-4"><code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Descripción, Description</code></td>
                  <td className="py-2 text-xs text-slate-500">Texto libre</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">Prioridad</td>
                  <td className="py-2 pr-4"><code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Prioridad, Priority</code></td>
                  <td className="py-2 text-xs text-slate-500">Highest/High → Alta · Medium → Media · Low/Lowest → Baja</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">Estado</td>
                  <td className="py-2 pr-4"><code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Categoría de estado, Estado</code></td>
                  <td className="py-2 text-xs text-slate-500">Por hacer → Backlog · En curso → En progreso · Listo → Done</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">Responsable proyecto</td>
                  <td className="py-2 pr-4"><code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Responsable del proyecto</code></td>
                  <td className="py-2 text-xs text-slate-500">Se guarda como responsable del proyecto</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">Persona asignada</td>
                  <td className="py-2 pr-4"><code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Persona asignada, Assignee</code></td>
                  <td className="py-2 text-xs text-slate-500">Se crea el usuario si no existe (sin email)</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">Creador / Informador</td>
                  <td className="py-2 pr-4"><code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Creador, Informador</code></td>
                  <td className="py-2 text-xs text-slate-500">Se muestra en el detalle de la tarea</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">Fecha límite</td>
                  <td className="py-2 pr-4"><code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Fecha de vencimiento, Due date</code></td>
                  <td className="py-2 text-xs text-slate-500">Soporta formato Jira (02/mar/26) e ISO</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">Comentarios</td>
                  <td className="py-2 pr-4"><code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Comentario, Comment</code></td>
                  <td className="py-2 text-xs text-slate-500">Se importan con fecha y autor</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proyectos detectados */}
      {preview && preview.projects?.length > 0 && (
        <div className="rounded-2xl border border-violet-200/80 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/5 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-violet-800 dark:text-violet-300">
            {preview.projects.length === 1 ? "Proyecto detectado" : "Proyectos detectados"}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {preview.projects.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 text-sm shadow-sm border border-violet-100 dark:border-violet-500/20"
              >
                <svg className="h-4 w-4 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="font-medium text-violet-700 dark:text-violet-300">{name}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Si el proyecto no existe en tu empresa se creará automáticamente al importar
          </p>
        </div>
      )}

      {/* Columnas detectadas */}
      {preview && relevantColumns.length > 0 && (
        <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-indigo-800 dark:text-indigo-300">Columnas detectadas que se importarán</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {relevantColumns.map((col) => (
              <span key={col} className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 text-sm shadow-sm border border-indigo-100 dark:border-indigo-500/20">
                <span className="font-medium text-indigo-700 dark:text-indigo-400">{getColumnLabel(col)}</span>
                <span className="text-slate-400 dark:text-slate-500">←</span>
                <span className="text-slate-600 dark:text-slate-400">{col}</span>
              </span>
            ))}
          </div>
          {preview.columns.length > relevantColumns.length && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {preview.columns.length - relevantColumns.length} columnas adicionales serán ignoradas
            </p>
          )}
        </div>
      )}

      {/* Preview de datos */}
      {preview && preview.preview.length > 0 && (
        <div className="content-card p-6">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Vista previa
            <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
              (mostrando {preview.preview.length} de {preview.totalRows} filas)
            </span>
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">#</th>
                  {relevantColumns.map((col) => (
                    <th key={col} className="py-2 pr-4 text-left font-medium text-slate-600 dark:text-slate-300">
                      <span className="block text-xs text-indigo-600 dark:text-indigo-400">{getColumnLabel(col)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-2 pr-3 text-xs text-slate-400 dark:text-slate-500">{i + 1}</td>
                    {relevantColumns.map((col) => {
                      const label = getColumnLabel(col);
                      const val = row[col] || "";
                      const isProject = label === "Proyecto";
                      return (
                        <td key={col} className={`max-w-[250px] truncate py-2 pr-4 ${isProject ? "font-medium text-violet-700 dark:text-violet-400" : "text-slate-700 dark:text-slate-300"}`}>
                          {val || <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Botón importar */}
      {preview && !result && (
        <div>
          <button
            onClick={doImport}
            disabled={importing}
            className="rounded-lg bg-indigo-400 px-6 py-2.5 font-semibold text-white shadow-sm transition hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Importando...
              </span>
            ) : (
              `Importar ${preview.totalRows} tareas`
            )}
          </button>
        </div>
      )}

      {/* Resultados */}
      {result && (
        <div className="content-card p-6">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Resultado de la importación</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4 text-center">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{result.total}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total filas</p>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{result.created}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Tareas creadas</p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-4 text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{result.updated ?? 0}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Tareas actualizadas</p>
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.commentsImported ?? 0}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Comentarios</p>
            </div>
            <div className="rounded-xl bg-red-50 dark:bg-red-500/10 p-4 text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.errors?.length ?? 0}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Errores</p>
            </div>
          </div>

          {/* Proyectos creados */}
          {result.projectsCreated?.length > 0 && (
            <div className="mt-4 rounded-xl bg-violet-50 dark:bg-violet-500/10 p-4">
              <h4 className="text-sm font-medium text-violet-800 dark:text-violet-300">
                {result.projectsCreated.length === 1 ? "Proyecto creado" : "Proyectos creados"}
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.projectsCreated.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 text-sm shadow-sm border border-violet-200 dark:border-violet-500/20">
                    <svg className="h-4 w-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="font-medium text-violet-700 dark:text-violet-300">{name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Usuarios creados */}
          {result.usersCreated?.length > 0 && (
            <div className="mt-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 p-4">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {result.usersCreated.length === 1 ? "Usuario creado (sin email)" : `${result.usersCreated.length} usuarios creados (sin email)`}
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Puedes asignarles un email desde la sección Usuarios para que puedan iniciar sesión</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.usersCreated.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 text-sm shadow-sm border border-blue-200 dark:border-blue-500/20">
                    <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium text-blue-700 dark:text-blue-300">{name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.errors?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200">Detalle de errores</h4>
              <ul className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="flex gap-2 rounded-lg bg-red-50 dark:bg-red-500/5 px-3 py-2 text-sm">
                    <span className="shrink-0 font-medium text-red-600 dark:text-red-400">Fila {e.row}:</span>
                    <span className="text-red-700 dark:text-red-300">{e.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={reset}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Importar otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
