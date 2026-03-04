import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import CustomSelect from "../components/CustomSelect";
import { useStickyCompact } from "../components/ProjectNavButtons";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

const ABSENCE_TYPES = [
  { value: "BAJA_MEDICA", label: "Baja médica" },
  { value: "HORAS_MEDICO", label: "Horas médico" },
  { value: "VACACIONES", label: "Vacaciones" },
  { value: "ASUNTOS_PROPIOS", label: "Asuntos propios" },
  { value: "MATERNIDAD_PATERNIDAD", label: "Maternidad/Paternidad" },
  { value: "FALLECIMIENTO", label: "Fallecimiento" },
  { value: "MUDANZA", label: "Mudanza" },
  { value: "OTRO", label: "Otro" },
];

const ABSENCE_STATUSES = [
  { value: "PENDING", label: "Pendiente" },
  { value: "APPROVED", label: "Aprobado" },
  { value: "REJECTED", label: "Rechazado" },
];

const typeLabel = (t) => ABSENCE_TYPES.find((x) => x.value === t)?.label || t;

function StatusBadge({ status }) {
  const styles = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
    APPROVED: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-600",
    REJECTED: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
  };
  const labels = { PENDING: "Pendiente", APPROVED: "Aprobado", REJECTED: "Rechazado" };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[status] || styles.PENDING}`}>
      {labels[status] || status}
    </span>
  );
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function useAttachmentBlob(absenceId, attId, mimeType) {
  const [url, setUrl] = React.useState(null);
  React.useEffect(() => {
    if (!absenceId || !attId) return;
    let revoked = false;
    const token = localStorage.getItem("token");
    fetch(`${API_BASE}/absences/${absenceId}/attachments/${attId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.blob())
      .then((blob) => {
        if (revoked) return;
        setUrl(URL.createObjectURL(blob));
      })
      .catch(() => {});
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [absenceId, attId]);
  return url;
}

function downloadAttachment(absenceId, attId, fileName) {
  const token = localStorage.getItem("token");
  fetch(`${API_BASE}/absences/${absenceId}/attachments/${attId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((r) => r.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "archivo";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    })
    .catch(() => {});
}

function AttachmentImage({ absenceId, attId, alt, onPreview }) {
  const blobUrl = useAttachmentBlob(absenceId, attId);
  if (!blobUrl) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-50 dark:bg-slate-800">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-500" />
      </div>
    );
  }
  return (
    <img
      src={blobUrl}
      alt={alt}
      className="max-h-48 w-full object-contain bg-slate-50 dark:bg-slate-800 cursor-pointer"
      onClick={() => onPreview?.({ data: blobUrl, name: alt })}
    />
  );
}

function AbsenceDetailModal({ absence, onClose, isAdmin, currentUserId, onApprove, onReject, onDelete }) {
  const [previewImage, setPreviewImage] = React.useState(null);
  const atts = absence.attachments || [];

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const isImage = (mime) => mime?.startsWith("image/");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Detalle de ausencia</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{typeLabel(absence.type)}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={absence.status} />
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Empleado</p>
            <div className="flex items-center gap-2">
              <Avatar name={absence.employee?.name} src={absence.employee?.avatarUrl} size="xs" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{absence.employee?.name || "—"}</span>
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Duración</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{absence.duration || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Fecha inicio</p>
            <p className="text-sm text-slate-700 dark:text-slate-200">{formatDate(absence.startDate)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Fecha fin</p>
            <p className="text-sm text-slate-700 dark:text-slate-200">{formatDate(absence.endDate)}</p>
          </div>
        </div>

        {absence.comments && (
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Comentarios</p>
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{absence.comments}</p>
          </div>
        )}

        {absence.reviewer && (
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Revisado por</p>
            <p className="text-sm text-slate-700 dark:text-slate-200">{absence.reviewer.name} — {formatDate(absence.reviewedAt)}</p>
          </div>
        )}

        {atts.length > 0 && (
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Archivos adjuntos ({atts.length})</p>
            <div className="space-y-2">
              {atts.map((att) => (
                <div key={att.id} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {isImage(att.mimeType) && (
                    <AttachmentImage absenceId={absence.id} attId={att.id} alt={att.originalName} onPreview={setPreviewImage} />
                  )}
                  <div className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-slate-900">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                      {isImage(att.mimeType) ? (
                        <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{att.originalName}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{formatBytes(att.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadAttachment(absence.id, att.id, att.originalName)}
                      className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition"
                      title="Descargar"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(isAdmin && absence.status === "PENDING") && (
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onReject(absence.id)}
              className="rounded-lg border border-red-200 dark:border-red-500/30 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
            >
              Rechazar
            </button>
            <button
              type="button"
              onClick={() => onApprove(absence.id)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
            >
              Aprobar
            </button>
          </div>
        )}

        {!isAdmin && absence.status === "PENDING" && absence.employeeId === currentUserId && (
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onDelete(absence.id)}
              className="rounded-lg border border-red-200 dark:border-red-500/30 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
            >
              Eliminar solicitud
            </button>
          </div>
        )}
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage.data} alt={previewImage.name} className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl" />
            <div className="absolute -top-3 -right-3 flex gap-1.5">
              <a
                href={previewImage.data}
                download={previewImage.name}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Descargar"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition"
                title="Cerrar"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-sm text-white/70 truncate">{previewImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AbsencesPage() {
  const { user } = useAuth();
  const { sentinelRef, compact } = useStickyCompact();
  const role = (user?.role && String(user.role).toUpperCase()) || "";
  const isAdmin = role === "ADMIN";
  const canCreate = role === "ADMIN" || role === "MEMBER";

  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const [form, setForm] = useState({
    type: "HORAS_MEDICO",
    startDate: "",
    endDate: "",
    duration: "",
    comments: "",
  });
  const [files, setFiles] = useState([]);
  const [selectedAbsence, setSelectedAbsence] = useState(null);

  const loadingRef = React.useRef(false);

  async function load(silent = false) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);
      const qs = params.toString();
      const data = await apiFetch(`/absences${qs ? `?${qs}` : ""}`);
      setAbsences(Array.isArray(data) ? data : []);
    } catch {
      if (!silent) setAbsences([]);
    } finally {
      if (!silent) setLoading(false);
      loadingRef.current = false;
    }
  }

  useEffect(() => {
    load();
  }, [filterType, filterStatus]);

  useEffect(() => {
    const interval = setInterval(() => load(true), 15000);
    function onFocus() { load(true); }
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [filterType, filterStatus]);

  const filtered = useMemo(() => absences, [absences]);

  const allSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.id)));
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkAction(status) {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      await apiFetch("/absences/bulk-status", {
        method: "PATCH",
        body: JSON.stringify({ ids: [...selected], status }),
      });
      setSelected(new Set());
      await load();
    } catch (err) {
      setError(err.message || "Error al actualizar");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleSingleAction(id, status) {
    try {
      await apiFetch(`/absences/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err.message || "Error al actualizar");
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("type", form.type);
      fd.append("startDate", form.startDate);
      if (form.endDate) fd.append("endDate", form.endDate);
      if (form.duration) fd.append("duration", form.duration);
      if (form.comments) fd.append("comments", form.comments);
      for (const f of files) {
        fd.append("files", f);
      }
      await apiFetch("/absences", {
        method: "POST",
        body: fd,
      });
      setForm({ type: "HORAS_MEDICO", startDate: "", endDate: "", duration: "", comments: "" });
      setFiles([]);
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err.message || "Error al crear ausencia");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("¿Eliminar esta ausencia?")) return;
    try {
      await apiFetch(`/absences/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message || "Error al eliminar");
    }
  }

  const filterBar = (vertical) => (
    <div className={vertical ? "flex flex-col gap-3" : "flex flex-wrap items-center gap-3"}>
      <CustomSelect
        value={filterType}
        onChange={(val) => setFilterType(val)}
        options={[{ value: "", label: "Todos los tipos" }, ...ABSENCE_TYPES]}
        size="sm"
      />
      <CustomSelect
        value={filterStatus}
        onChange={(val) => setFilterStatus(val)}
        options={[{ value: "", label: "Todos los estados" }, ...ABSENCE_STATUSES]}
        size="sm"
      />
      <div className="flex items-center gap-1">
        <button type="button" onClick={load} title="Recargar" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800">
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
        </button>
        <button type="button" onClick={() => { setFilterType(""); setFilterStatus(""); }} title="Limpiar filtros" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800">
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>
        </button>
        <button type="button" title="Exportar" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800">
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M9.75 21h4.5" /></svg>
        </button>
      </div>
      {!vertical && canCreate && (
        <button type="button" onClick={() => { setShowCreate(true); setError(""); }} className="ml-auto flex items-center gap-2 rounded-lg bg-indigo-400 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nueva ausencia
        </button>
      )}
      {vertical && isAdmin && selected.size > 0 && (
        <div className="flex flex-col gap-2">
          <button type="button" disabled={bulkLoading} onClick={() => handleBulkAction("APPROVED")} className="rounded-full bg-indigo-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60 w-full">Aceptar</button>
          <button type="button" disabled={bulkLoading} onClick={() => handleBulkAction("REJECTED")} className="rounded-full border-2 border-indigo-400 bg-white px-4 py-2 text-sm font-semibold text-indigo-400 shadow-sm transition hover:bg-indigo-50 disabled:opacity-60 dark:bg-slate-800 w-full">Rechazar</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div ref={sentinelRef} className="h-px w-full -mb-px" />

      {/* Floating sidebar filters - visible only when scrolled */}
      {compact && (
        <div className="fixed top-16 z-40 w-44 flex flex-col gap-4" style={{ left: "max(100px, calc((100vw - 1364px) / 4 - 4px))" }}>
          {canCreate && (
            <button type="button" onClick={() => { setShowCreate(true); setError(""); }} className="flex items-center gap-2 rounded-lg bg-indigo-400 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 w-full justify-center">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Nueva ausencia
            </button>
          )}
          {filterBar(true)}
        </div>
      )}

      {/* Horizontal filter bar - visible only when NOT scrolled */}
      {!compact && filterBar(false)}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30">
          {error}
          <button type="button" onClick={() => setError("")} className="ml-2 font-semibold hover:underline">Cerrar</button>
        </div>
      )}

      {/* List */}
      <div className="space-y-0">
        {/* Select all */}
        {isAdmin && filtered.length > 0 && (
          <div className="relative px-4 py-2">
            <button type="button" onClick={toggleSelectAll} className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${allSelected ? "border-indigo-400 bg-indigo-400" : "border-indigo-300 bg-transparent"}`}>
                {allSelected && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </span>
              Seleccionar todo
            </button>
            {selected.size > 0 && (
              <div className="absolute right-0 -top-1 flex items-center gap-2">
                <button type="button" disabled={bulkLoading} onClick={() => handleBulkAction("APPROVED")} className="rounded-full bg-indigo-400 px-6 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60">Aceptar</button>
                <button type="button" disabled={bulkLoading} onClick={() => handleBulkAction("REJECTED")} className="rounded-full border-2 border-indigo-400 bg-white px-6 py-1.5 text-sm font-semibold text-indigo-400 shadow-sm transition hover:bg-indigo-50 disabled:opacity-60 dark:bg-slate-800 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-slate-700">Rechazar</button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
            <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <p className="text-sm font-medium">No hay ausencias registradas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelectedAbsence(a)}
                className="flex items-center gap-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 shadow-sm transition hover:shadow-md cursor-pointer"
              >
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleSelect(a.id); }}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${selected.has(a.id) ? "border-indigo-400 bg-indigo-400" : "border-indigo-300 bg-transparent"}`}
                  >
                    {selected.has(a.id) && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                )}

                <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
                  <div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Tipo de solicitud</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{typeLabel(a.type)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Empleado</p>
                    <div className="flex items-center gap-1.5">
                      <Avatar name={a.employee?.name} src={a.employee?.avatarUrl} size="2xs" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{a.employee?.name || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Duración</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{a.duration || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Fechas</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      {formatDate(a.startDate)}
                      {a.endDate && a.endDate !== a.startDate ? ` – ${formatDate(a.endDate)}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Comentarios</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[180px]">{a.comments || "—"}</p>
                    {a.attachments && a.attachments.length > 0 && (
                      <div className="mt-1 flex items-center gap-1 text-indigo-500 dark:text-indigo-400">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                        </svg>
                        <span className="text-xs font-medium">{a.attachments.length} adjunto{a.attachments.length > 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <StatusBadge status={a.status} />
                    {isAdmin && a.status === "PENDING" && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleSingleAction(a.id, "APPROVED")}
                          className="rounded-md bg-emerald-50 p-1 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                          title="Aprobar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSingleAction(a.id, "REJECTED")}
                          className="rounded-md bg-red-50 p-1 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                          title="Rechazar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {!isAdmin && a.status === "PENDING" && a.employeeId === user?.id && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
                        className="rounded-md bg-red-50 p-1 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                        title="Eliminar"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedAbsence && (
        <AbsenceDetailModal
          absence={selectedAbsence}
          onClose={() => setSelectedAbsence(null)}
          isAdmin={isAdmin}
          currentUserId={user?.id}
          onApprove={(id) => { handleSingleAction(id, "APPROVED"); setSelectedAbsence(null); }}
          onReject={(id) => { handleSingleAction(id, "REJECTED"); setSelectedAbsence(null); }}
          onDelete={(id) => { handleDelete(id); setSelectedAbsence(null); }}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Nueva ausencia</h3>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Solicita una ausencia</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Tipo de solicitud *</label>
                <CustomSelect
                  value={form.type}
                  onChange={(val) => setForm((f) => ({ ...f, type: val }))}
                  options={ABSENCE_TYPES}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Fecha inicio *</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Fecha fin</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Duración</label>
                <input
                  type="text"
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  placeholder="Ej: 2 horas, 3 días, 1 semana..."
                  className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Comentarios</label>
                <textarea
                  value={form.comments}
                  onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
                  rows={3}
                  placeholder="Motivo o detalles adicionales..."
                  className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Adjuntar archivos</label>
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 transition hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                    </svg>
                    Seleccionar archivos
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    />
                  </label>
                  {files.length > 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {files.length} archivo{files.length > 1 ? "s" : ""} seleccionado{files.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <span className="truncate max-w-[250px]">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="ml-2 text-red-400 hover:text-red-600"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-400 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                >
                  {saving ? "Enviando..." : "Enviar solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
