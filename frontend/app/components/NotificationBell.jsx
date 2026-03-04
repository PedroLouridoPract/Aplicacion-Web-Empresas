import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/http";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  async function fetchNotifications() {
    try {
      const data = await apiFetch("/notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        ref.current && !ref.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) setOpen(false);
    }
    function handleEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  async function handleToggle() {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
    if (!open) fetchNotifications();
  }

  async function handleMarkAllRead() {
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }

  async function handleDeleteAll() {
    try {
      await apiFetch("/notifications", { method: "DELETE" });
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  }

  async function handleMarkRead(id) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div ref={panelRef} className="fixed w-80 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl" style={{ top: panelPos.top, right: panelPos.right, zIndex: 99999 }}>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Marcar leídas
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  className="text-xs font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Borrar todas
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400 dark:text-slate-500">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-xs">No tienes notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.read) handleMarkRead(n.id);
                    setOpen(false);
                    if (n.absenceId) {
                      navigate("/absences");
                    } else {
                      navigate("/my-tasks", { state: n.taskId ? { openTaskId: n.taskId } : undefined });
                    }
                  }}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    !n.read ? "bg-indigo-50/50 dark:bg-indigo-400/5" : ""
                  }`}
                >
                  <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
                    <div className={`flex h-2 w-2 rounded-full ${!n.read ? "bg-indigo-400" : "bg-transparent"}`} />
                    {n.absenceId ? (
                      <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${!n.read ? "font-medium text-slate-800 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"}`}>
                      {n.message}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
