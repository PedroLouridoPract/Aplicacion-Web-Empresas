import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

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

const DashboardIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="4" rx="1.5" />
    <rect x="3" y="14" width="7" height="4" rx="1.5" />
    <rect x="14" y="11" width="7" height="7" rx="1.5" />
  </svg>
);

const NewTaskIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TABS = [
  { key: "detail", label: "Detalles", icon: DetailIcon },
  { key: "kanban", label: "Kanban", icon: KanbanIcon },
  { key: "executive", label: "Tabla ejecutiva", icon: TableIcon },
  { key: "calendar", label: "Calendario", icon: CalendarIcon },
  { key: "dashboard", label: "Dashboard", icon: DashboardIcon },
];

const tabBase = "inline-flex items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors duration-150 whitespace-nowrap";
const tabActive = "bg-indigo-400 text-white";
const tabInactive = "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200";

export default function ProjectNavButtons({ projectId, current, compact = false }) {
  return (
    <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 gap-0.5">
      {TABS.map((tab) => {
        const isActive = tab.key === current;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.key}
            to={tab.key === "detail" ? `/projects/${projectId}` : `/projects/${projectId}/${tab.key}`}
            title={tab.label}
            className={`${tabBase} ${isActive ? tabActive : tabInactive} ${compact ? "h-8 w-8" : "px-4 py-1.5"}`}
          >
            <Icon />
            {!compact && <span>{tab.label}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function NewTaskButton({ onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Nueva tarea"
      className={`inline-flex items-center justify-center gap-2 bg-indigo-400 text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer not-disabled:hover:-translate-y-0.5 not-disabled:hover:shadow-[0_4px_12px_rgba(95,150,249,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-indigo-300 ${compact ? "h-9 w-9" : "h-12 px-6"}`}
    >
      <NewTaskIcon />
      {!compact && <span>Nueva tarea</span>}
    </button>
  );
}

const THRESHOLD = 120;
const DURATION = 200;

export function useStickyCompact() {
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);
  const rafId = useRef(0);
  const cleanupRef = useRef(null);
  const suppressUntil = useRef(0);
  const stickyRef = useRef(null);

  const sentinelRef = useCallback((node) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (!node) return;

    stickyRef.current = node.nextElementSibling;
    const scrollParent = node.closest("main") || document.querySelector("main") || document.documentElement;

    let ticking = false;
    const check = () => {
      ticking = false;
      if (Date.now() < suppressUntil.current) return;

      const st = scrollParent.scrollTop;
      if (!compactRef.current && st > THRESHOLD) {
        const hBefore = stickyRef.current ? stickyRef.current.offsetHeight : 0;
        compactRef.current = true;
        setCompact(true);
        suppressUntil.current = Date.now() + 300;
        requestAnimationFrame(() => {
          const hAfter = stickyRef.current ? stickyRef.current.offsetHeight : 0;
          const diff = hBefore - hAfter;
          if (diff > 0) scrollParent.scrollTop = Math.max(0, scrollParent.scrollTop - diff);
        });
      } else if (compactRef.current && st <= 10) {
        compactRef.current = false;
        setCompact(false);
        suppressUntil.current = Date.now() + 300;
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        rafId.current = requestAnimationFrame(check);
      }
    };

    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    check();

    cleanupRef.current = () => {
      scrollParent.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  useEffect(() => {
    return () => { if (cleanupRef.current) cleanupRef.current(); };
  }, []);

  return { sentinelRef, compact };
}

export const stickyTransition = {
  wrapper: (compact) => ({
    transition: `background-color ${DURATION}ms ease, box-shadow ${DURATION}ms ease, border-color ${DURATION}ms ease`,
  }),
  navRow: (compact) => ({
    maxHeight: compact ? 0 : 80,
    opacity: compact ? 0 : 1,
    overflow: "hidden",
    transition: `max-height ${DURATION}ms ease, opacity ${compact ? DURATION * 0.4 : DURATION}ms ease`,
    pointerEvents: compact ? "none" : "auto",
  }),
  compactItems: (compact) => ({
    opacity: compact ? 1 : 0,
    maxWidth: compact ? 600 : 0,
    overflow: "hidden",
    transition: `opacity ${compact ? DURATION : DURATION * 0.4}ms ease, max-width ${DURATION}ms ease`,
    pointerEvents: compact ? "auto" : "none",
  }),
};

export function ProjectLoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-700" />
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-indigo-600" />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-400 dark:text-slate-500">Cargando...</p>
    </div>
  );
}
