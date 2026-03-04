import React, { useEffect, useRef } from "react";

export default function ConfirmModal({
  open,
  title = "¿Estás seguro?",
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const iconColors =
    variant === "danger"
      ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
      : "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400";

  const confirmColors =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 focus:ring-red-500/30"
      : "bg-amber-500 hover:bg-amber-600 focus:ring-amber-500/30";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "confirmModalIn 0.2s ease-out" }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconColors}`}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
            {message && (
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{message}</p>
            )}
          </div>

          <div className="flex w-full gap-3 pt-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/20 disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition focus:outline-none focus:ring-2 disabled:opacity-60 ${confirmColors}`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Eliminando...
                </span>
              ) : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
