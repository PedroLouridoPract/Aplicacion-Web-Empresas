import React, { useEffect, useState, useMemo, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import TaskDetailPopup from "../components/TaskDetailPopup";

const BASE_COLUMN_COLORS = {
  backlog: "#94a3b8",
  in_progress: "#3b82f6",
  review: "#f59e0b",
  done: "#10b981",
};



const FALLBACK_COLORS = [
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4",
  "#84cc16", "#e11d48", "#5F96F9", "#22d3ee", "#a855f7",
];

function getColumnColor(col, idx) {
  if (col.color) return col.color;
  if (BASE_COLUMN_COLORS[col.key]) return BASE_COLUMN_COLORS[col.key];
  return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

function fmtHours(h) {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

function ProjectDropdown({ projects, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function close(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const label = selected
    ? projects.find((p) => p.id === selected)?.name ?? "Proyecto"
    : "Todos los proyectos";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition min-w-[180px] cursor-pointer"
      >
        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="truncate flex-1 text-left">{label}</span>
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-64 rounded-2xl bg-white dark:bg-slate-800 shadow-lg ring-1 ring-slate-200/60 dark:ring-slate-700 py-1.5 max-h-72 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
              !selected ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium" : "text-slate-700 dark:text-slate-200"
            }`}
          >
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Todos los proyectos
          </button>
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(p.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
                selected === p.id ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium" : "text-slate-700 dark:text-slate-200"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: p.color || "#5F96F9" }}
              />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const RANGE_OPTIONS = [
  { key: "12months", label: "Últimos 12 meses" },
  { key: "thisMonth", label: "Este mes" },
  { key: "thisYear", label: "Este año" },
  { key: "custom", label: "Rango personalizado" },
];

function RangeDropdown({ rangeKey, customFrom, customTo, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function close(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  let label = RANGE_OPTIONS.find((o) => o.key === rangeKey)?.label ?? "Últimos 12 meses";
  if (rangeKey === "custom" && customFrom && customTo) {
    const fmt = (d) => d.split("-").reverse().join("/");
    label = `${fmt(customFrom)} – ${fmt(customTo)}`;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition min-w-[180px] cursor-pointer"
      >
        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <span className="truncate flex-1 text-left">{label}</span>
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-2xl bg-white dark:bg-slate-800 shadow-lg ring-1 ring-slate-200/60 dark:ring-slate-700 py-1.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                onSelect(opt.key);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
                rangeKey === opt.key
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ColumnFilterDropdown({ columns, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function close(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const allSelected = columns.length > 0 && selected.length === columns.length;
  const label = allSelected || selected.length === 0
    ? "Todos"
    : selected.length === 1
      ? columns.find((c) => c.key === selected[0])?.name ?? "1 estado"
      : `${selected.length} estados`;

  function toggle(key) {
    onChange((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleAll() {
    onChange(allSelected ? [] : columns.map((c) => c.key));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition cursor-pointer"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
        </svg>
        <span>{label}</span>
        <svg className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl bg-white dark:bg-slate-800 shadow-lg ring-1 ring-slate-200/60 dark:ring-slate-700 py-1 max-h-60 overflow-y-auto">
          <label className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            Todos los estados
          </label>
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <input
                type="checkbox"
                checked={selected.includes(col.key)}
                onChange={() => toggle(col.key)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
              />
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: col.color }} />
              <span className="text-slate-700 dark:text-slate-200 truncate">{col.name}</span>
              <span className="ml-auto text-xs tabular-nums text-slate-400">{col.value}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user, booting } = useAuth();
  const role = (user?.role && String(user.role).toUpperCase()) || "";
  const isAdmin = role === "ADMIN";

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rangeKey, setRangeKey] = useState("12months");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const days = useMemo(() => {
    const today = new Date();
    if (rangeKey === "12months") return 365;
    if (rangeKey === "thisMonth") {
      return today.getDate();
    }
    if (rangeKey === "thisYear") {
      const start = new Date(today.getFullYear(), 0, 1);
      return Math.ceil((today - start) / (1000 * 60 * 60 * 24)) + 1;
    }
    if (rangeKey === "custom" && customFrom && customTo) {
      const diff = Math.ceil((new Date(customTo) - new Date(customFrom)) / (1000 * 60 * 60 * 24)) + 1;
      return Math.min(Math.max(diff, 1), 365);
    }
    return 365;
  }, [rangeKey, customFrom, customTo]);

  useEffect(() => {
    if (booting || !user || !isAdmin) return;
    apiFetch("/projects")
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.projects ?? res?.data ?? [];
        setProjects(list);
      })
      .catch(() => {});
  }, [booting, user, isAdmin]);

  useEffect(() => {
    if (booting || !user || !isAdmin) return;
    const url = selectedProject
      ? `/projects/${selectedProject}/tasks`
      : "/tasks";
    apiFetch(url)
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        setPendingTasks(list.filter((t) => t.status !== "DONE"));
      })
      .catch(() => setPendingTasks([]));
  }, [booting, user, isAdmin, selectedProject]);

  useEffect(() => {
    if (booting || !user || !isAdmin) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    const url = selectedProject
      ? `/projects/${selectedProject}/metrics?days=${days}`
      : `/dashboard/metrics?days=${days}`;

    apiFetch(url)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err?.message || "Error al cargar métricas"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selectedProject, days, booting, user, isAdmin]);

  const allColumns = useMemo(() => {
    if (!data?.byColumn) return [];
    return data.byColumn.map((c, i) => ({
      key: c.key || c.label,
      name: c.label,
      value: c.count,
      color: getColumnColor(c, i),
    }));
  }, [data]);

  useEffect(() => {
    if (allColumns.length > 0) {
      setSelectedColumns(allColumns.map((c) => c.key));
    }
  }, [allColumns]);

  const columnPieData = useMemo(() => {
    return allColumns.filter((c) => c.value > 0 && selectedColumns.includes(c.key));
  }, [allColumns, selectedColumns]);

  const trendData = useMemo(() => {
    if (!data?.trend) return [];
    const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const grouped = {};
    for (const t of data.trend) {
      const key = t.date.slice(0, 7);
      if (!grouped[key]) grouped[key] = { created: 0, completed: 0 };
      grouped[key].created += t.created;
      grouped[key].completed += t.completed;
    }
    return Object.entries(grouped).map(([key, v]) => {
      const monthIdx = parseInt(key.slice(5, 7), 10) - 1;
      return { date: MONTH_NAMES[monthIdx], Creadas: v.created, Completadas: v.completed };
    });
  }, [data]);

  const navigate = useNavigate();

  if (!isAdmin) return <Navigate to="/my-tasks" replace />;

  const quickAccessProjectId = selectedProject || projects[0]?.id;
  const quickLinks = [
    {
      label: "Detalles",
      sub: "Vista general",
      path: quickAccessProjectId ? `/projects/${quickAccessProjectId}` : null,
      iconBg: "bg-indigo-50 dark:bg-indigo-500/10",
      iconColor: "text-indigo-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      ),
    },
    {
      label: "Kanban",
      sub: "Tablero visual",
      path: quickAccessProjectId ? `/projects/${quickAccessProjectId}/kanban` : null,
      iconBg: "bg-blue-50 dark:bg-blue-500/10",
      iconColor: "text-blue-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125c-.621 0-1.125.504-1.125 1.125v12.75c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
      ),
    },
    {
      label: "Tabla ejecutiva",
      sub: "Vista de datos",
      path: quickAccessProjectId ? `/projects/${quickAccessProjectId}/executive` : null,
      iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
      iconColor: "text-emerald-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h-7.5m8.625 0c-.621 0-1.125.504-1.125 1.125m1.125-1.125h7.5m-8.625 0c.621 0 1.125.504 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-2.25 0c-.621 0-1.125.504-1.125 1.125" />
        </svg>
      ),
    },
    {
      label: "Calendario",
      sub: "Vista temporal",
      path: quickAccessProjectId ? `/projects/${quickAccessProjectId}/calendar` : null,
      iconBg: "bg-amber-50 dark:bg-amber-500/10",
      iconColor: "text-amber-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
        </svg>
      ),
    },
  ];

  const kpis = [
    {
      label: "Total tareas",
      value: data?.totalTasks ?? 0,
      iconBg: "bg-indigo-50 dark:bg-indigo-500/10",
      iconColor: "text-indigo-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: "Atrasadas",
      value: data?.overdueTasks ?? 0,
      iconBg: "bg-red-50 dark:bg-red-500/10",
      iconColor: "text-red-500",
      accent: (data?.overdueTasks ?? 0) > 0 ? "text-red-500" : undefined,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Progreso medio",
      value: `${data?.avgProgress ?? 0}%`,
      iconBg: "bg-blue-50 dark:bg-blue-500/10",
      iconColor: "text-blue-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: "Velocidad 7d",
      value: data?.velocity?.last7d ?? 0,
      sub: `${data?.velocity?.last30d ?? 0} en ${data?.days ?? 30}d`,
      iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
      iconColor: "text-emerald-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Tiempo resolución",
      value: fmtHours(data?.avgResolutionHours),
      iconBg: "bg-amber-50 dark:bg-amber-500/10",
      iconColor: "text-amber-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const columnPieTotal = columnPieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-end gap-4">
        <div className="flex items-center gap-3">
          <ProjectDropdown
            projects={projects}
            selected={selectedProject}
            onChange={setSelectedProject}
          />

          <RangeDropdown
            rangeKey={rangeKey}
            customFrom={customFrom}
            customTo={customTo}
            onSelect={(key) => {
              if (key === "custom") {
                const today = new Date().toISOString().slice(0, 10);
                const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
                setTempFrom(customFrom || yearAgo);
                setTempTo(customTo || today);
                setShowCustomRange(true);
              } else {
                setRangeKey(key);
              }
            }}
          />
        </div>
      </div>

      {/* Accesos rápidos */}
      {projects.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Accesos rápidos</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                disabled={!link.path}
                onClick={() => link.path && navigate(link.path)}
                className="content-card flex items-center gap-3.5 px-5 py-4 text-left transition hover:shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer group"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${link.iconBg} ${link.iconColor} transition group-hover:scale-110`}>
                  {link.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{link.label}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{link.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="content-card px-5 py-16 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Cargando métricas...</p>
        </div>
      )}

      {/* Error */}
      {error && !data && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="content-card flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${kpi.accent || "text-slate-800 dark:text-slate-100"}`}>
                    {kpi.value}
                  </p>
                  {kpi.sub && (
                    <p className="mt-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">{kpi.sub}</p>
                  )}
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${kpi.iconBg} ${kpi.iconColor}`}>
                  {kpi.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Evolution chart + Priority */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="content-card p-6 lg:col-span-2">
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Evolución de tareas</h3>
              </div>
              <div className="flex items-center gap-5 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5F96F9]" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Tareas creadas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#94a3b8]" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Tareas completadas</span>
                </div>
              </div>
              {trendData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5F96F9" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#5F96F9" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="gradDone" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid horizontal vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2e8f0", fontSize: "0.8rem", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                        itemStyle={{ fontSize: "0.75rem" }}
                      />
                      <Area type="monotone" dataKey="Creadas" stroke="#5F96F9" strokeWidth={2.5} fill="url(#gradCreated)" dot={false} activeDot={{ r: 4, fill: "#5F96F9", strokeWidth: 2, stroke: "#fff" }} />
                      <Area type="monotone" dataKey="Completadas" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 3" fill="url(#gradDone)" dot={false} activeDot={{ r: 4, fill: "#94a3b8", strokeWidth: 2, stroke: "#fff" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-8 text-center text-sm text-slate-400">Sin datos</p>
              )}
            </div>

            <div className="content-card p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Por estado</h3>
                <ColumnFilterDropdown
                  columns={allColumns}
                  selected={selectedColumns}
                  onChange={setSelectedColumns}
                />
              </div>
              {columnPieTotal > 0 ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-44 w-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={columnPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={65}
                          strokeWidth={2}
                          stroke="#fff"
                        >
                          {columnPieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.8rem" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2 text-sm w-full">
                    {columnPieData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-slate-600 dark:text-slate-300">{d.name}</span>
                        <span className="ml-auto tabular-nums font-medium text-slate-800 dark:text-slate-100">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-8 text-center text-sm text-slate-400">Sin datos</p>
              )}
            </div>
          </div>

          {/* Users ranking + Pending tasks row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Pending tasks */}
            {pendingTasks.length > 0 && (
              <div className="content-card p-5 flex flex-col" style={{ maxHeight: 340 }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tareas pendientes</h3>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {pendingTasks.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
                  {pendingTasks.map((task) => {
                    const PRIO_COLORS = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#94a3b8" };
                    const PRIO_LABELS = { HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" };
                    const barColor = PRIO_COLORS[task.priority] || "#94a3b8";
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                    const fmtDate = task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
                      : null;

                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setSelectedTask(task)}
                        className="w-full text-left group shrink-0"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-700 dark:text-slate-200 truncate max-w-[200px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition font-medium">
                            {task.title}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {fmtDate && (
                              <span className={`text-[10px] tabular-nums ${isOverdue ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                                {fmtDate}
                              </span>
                            )}
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: barColor + "18", color: barColor }}>
                              {PRIO_LABELS[task.priority] || task.priority}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${task.progress ?? 0}%`, background: barColor }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Users ranking */}
            {data?.byUser?.length > 0 && (() => {
              const BAR_COLORS = ["#5F96F9", "#94a3b8", "#c4b5fd", "#67e8f9", "#a3e635", "#fbbf24", "#f87171"];
              const sorted = [...data.byUser].sort((a, b) => b.done - a.done || b.total - a.total);
              const maxDone = sorted[0]?.done || 1;
              const grandTotal = sorted.reduce((s, r) => s + r.total, 0);
              return (
                <div className="content-card p-5 flex flex-col" style={{ maxHeight: 340 }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Top rendimiento por usuario</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
                    {sorted.map((row, i) => {
                      const pct = maxDone > 0 ? (row.done / maxDone) * 100 : 0;
                      const barColor = BAR_COLORS[i % BAR_COLORS.length];
                      return (
                        <div key={row.user.id} className="shrink-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[160px]">{row.user.name}</span>
                              <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500 shrink-0">{row.total}</span>
                            </div>
                            <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100">{row.done} hechas</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: barColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Total asignadas</span>
                    <span className="text-xs font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{grandTotal}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Column cards detail */}
          {data?.byColumn?.length > 0 && (
            <div className="content-card p-6">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Detalle de columnas</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.byColumn.map((col, i) => {
                  const color = getColumnColor(col, i);
                  const pct = data.totalTasks > 0 ? ((col.count / data.totalTasks) * 100).toFixed(1) : "0.0";
                  return (
                    <div
                      key={col.key}
                      className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{col.label}</span>
                        {!col.isBase && (
                          <span className="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            Personalizada
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{col.count}</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">{pct}% del total</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Task detail popup */}
      {selectedTask && (
        <TaskDetailPopup
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onCommentAdded={() => {}}
        />
      )}

      {/* Custom range modal */}
      {showCustomRange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setShowCustomRange(false)}>
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-5">Seleccionar rango personalizado</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Fecha de inicio</label>
                <input
                  type="date"
                  value={tempFrom}
                  onChange={(e) => setTempFrom(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Fecha de fin</label>
                <input
                  type="date"
                  value={tempTo}
                  onChange={(e) => setTempTo(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCustomRange(false)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!tempFrom || !tempTo || tempFrom > tempTo}
                onClick={() => {
                  setCustomFrom(tempFrom);
                  setCustomTo(tempTo);
                  setRangeKey("custom");
                  setShowCustomRange(false);
                }}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
