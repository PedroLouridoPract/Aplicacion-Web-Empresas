import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
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
import ProjectNavButtons, { ProjectLoadingSpinner } from "../components/ProjectNavButtons";

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
              onClick={() => { onSelect(opt.key); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
                rangeKey === opt.key ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium" : "text-slate-700 dark:text-slate-200"
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
    onChange((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
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
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
            Todos los estados
          </label>
          {columns.map((col) => (
            <label key={col.key} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
              <input type="checkbox" checked={selected.includes(col.key)} onChange={() => toggle(col.key)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
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

export default function ProjectDashboardPage() {
  const { id } = useParams();
  const { user, booting } = useAuth();

  const [project, setProject] = useState(null);
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
    if (rangeKey === "thisMonth") return today.getDate();
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
    if (booting || !user) return;
    apiFetch(`/projects/${id}`)
      .then((res) => setProject(res))
      .catch(() => {});
  }, [booting, user, id]);

  useEffect(() => {
    if (booting || !user) return;
    apiFetch(`/projects/${id}/tasks`)
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        setPendingTasks(list.filter((t) => t.status !== "DONE"));
      })
      .catch(() => setPendingTasks([]));
  }, [booting, user, id]);

  useEffect(() => {
    if (booting || !user) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    apiFetch(`/projects/${id}/metrics?days=${days}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err?.message || "Error al cargar métricas"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id, days, booting, user]);

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
    if (allColumns.length > 0) setSelectedColumns(allColumns.map((c) => c.key));
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

  if (booting) return <ProjectLoadingSpinner />;

  const kpis = [
    {
      label: "Total tareas",
      value: data?.totalTasks ?? 0,
      iconBg: "bg-[#d2ecff] dark:bg-[#d2ecff]/20",
      iconColor: "text-[#5f96f9]",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: "Atrasadas",
      value: data?.overdueTasks ?? 0,
      iconBg: "bg-[#d2ecff] dark:bg-[#d2ecff]/20",
      iconColor: "text-[#5f96f9]",
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
      iconBg: "bg-[#d2ecff] dark:bg-[#d2ecff]/20",
      iconColor: "text-[#5f96f9]",
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
      iconBg: "bg-[#d2ecff] dark:bg-[#d2ecff]/20",
      iconColor: "text-[#5f96f9]",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Tiempo resolución",
      value: fmtHours(data?.avgResolutionHours),
      iconBg: "bg-[#d2ecff] dark:bg-[#d2ecff]/20",
      iconColor: "text-[#5f96f9]",
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
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/projects" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 transition hover:bg-slate-50 dark:hover:bg-slate-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="mr-auto">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {project?.name ? `${project.name} — Dashboard` : "Dashboard"}
            </h2>
          </div>
          <ProjectNavButtons projectId={id} current="dashboard" />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
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

      {/* Loading */}
      {loading && !data && (
        <div className="content-card px-5 py-16 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Cargando métricas...</p>
        </div>
      )}

      {error && !data && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="content-card flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${kpi.accent || "text-slate-800 dark:text-slate-100"}`}>{kpi.value}</p>
                  {kpi.sub && <p className="mt-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">{kpi.sub}</p>}
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${kpi.iconBg} ${kpi.iconColor}`}>{kpi.icon}</div>
              </div>
            ))}
          </div>

          {/* Evolution chart + Pie */}
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
                        <linearGradient id="gradCreatedP" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5F96F9" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#5F96F9" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="gradDoneP" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid horizontal vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2e8f0", fontSize: "0.8rem", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} itemStyle={{ fontSize: "0.75rem" }} />
                      <Area type="monotone" dataKey="Creadas" stroke="#5F96F9" strokeWidth={2.5} fill="url(#gradCreatedP)" dot={false} activeDot={{ r: 4, fill: "#5F96F9", strokeWidth: 2, stroke: "#fff" }} />
                      <Area type="monotone" dataKey="Completadas" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 3" fill="url(#gradDoneP)" dot={false} activeDot={{ r: 4, fill: "#94a3b8", strokeWidth: 2, stroke: "#fff" }} />
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
                <ColumnFilterDropdown columns={allColumns} selected={selectedColumns} onChange={setSelectedColumns} />
              </div>
              {columnPieTotal > 0 ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-44 w-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={columnPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={65} strokeWidth={2} stroke="#fff">
                          {columnPieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
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

          {/* Three info boxes */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Box 1: Users with pending tasks */}
            <div className="content-card p-5 flex flex-col" style={{ maxHeight: 380 }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tareas por completar</h3>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{pendingTasks.length}</span>
              </div>
              {pendingTasks.length > 0 ? (() => {
                const grouped = {};
                for (const t of pendingTasks) {
                  const uid = t.assignee?.id || "_unassigned";
                  if (!grouped[uid]) grouped[uid] = { user: t.assignee, tasks: [] };
                  grouped[uid].tasks.push(t);
                }
                const entries = Object.values(grouped).sort((a, b) => b.tasks.length - a.tasks.length);
                return (
                  <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
                    {entries.map((entry) => (
                      <div key={entry.user?.id || "_unassigned"} className="shrink-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          {entry.user?.avatarUrl ? (
                            <img src={entry.user.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-[#5F96F9]/20 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-[#5F96F9]">{(entry.user?.name || "?")[0].toUpperCase()}</span>
                            </div>
                          )}
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{entry.user?.name || "Sin asignar"}</span>
                          <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500 ml-auto shrink-0">{entry.tasks.length} {entry.tasks.length === 1 ? "tarea" : "tareas"}</span>
                        </div>
                        <div className="flex flex-col gap-1.5 pl-7">
                          {entry.tasks.slice(0, 4).map((task) => {
                            const PRIO_COLORS = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#94a3b8" };
                            const barColor = PRIO_COLORS[task.priority] || "#94a3b8";
                            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                            const fmtDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : null;
                            return (
                              <button key={task.id} type="button" onClick={() => setSelectedTask(task)} className="w-full text-left group">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[140px] group-hover:text-[#5F96F9] transition font-medium">{task.title}</span>
                                  <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                                    {fmtDate && <span className={`text-[9px] tabular-nums ${isOverdue ? "text-red-500 font-semibold" : "text-slate-400"}`}>{fmtDate}</span>}
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: barColor }} />
                                  </div>
                                </div>
                                <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mt-0.5">
                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${task.progress ?? 0}%`, background: barColor }} />
                                </div>
                              </button>
                            );
                          })}
                          {entry.tasks.length > 4 && <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">+{entry.tasks.length - 4} más</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })() : (
                <p className="flex-1 flex items-center justify-center text-sm text-slate-400">No hay tareas pendientes</p>
              )}
            </div>

            {/* Box 2: Column detail */}
            <div className="content-card p-5 flex flex-col" style={{ maxHeight: 380 }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Detalle de columnas</h3>
              </div>
              {data?.byColumn?.length > 0 ? (
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
                  {data.byColumn.map((col, i) => {
                    const color = getColumnColor(col, i);
                    const pct = data.totalTasks > 0 ? ((col.count / data.totalTasks) * 100) : 0;
                    return (
                      <div key={col.key} className="shrink-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{col.label}</span>
                            {!col.isBase && <span className="rounded bg-slate-100 dark:bg-slate-700 px-1 py-0.5 text-[9px] font-medium text-slate-400 shrink-0">Custom</span>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100">{col.count}</span>
                            <span className="text-[10px] tabular-nums text-slate-400">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Total tareas</span>
                    <span className="text-xs font-bold tabular-nums text-[#5F96F9]">{data.totalTasks}</span>
                  </div>
                </div>
              ) : (
                <p className="flex-1 flex items-center justify-center text-sm text-slate-400">Sin datos</p>
              )}
            </div>

            {/* Box 3: Priority distribution */}
            <div className="content-card p-5 flex flex-col" style={{ maxHeight: 380 }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Distribución por prioridad</h3>
              </div>
              {data?.byPriority && (data.byPriority.HIGH + data.byPriority.MEDIUM + data.byPriority.LOW) > 0 ? (() => {
                const priorities = [
                  { key: "HIGH", label: "Alta", color: "#ef4444", count: data.byPriority.HIGH ?? 0 },
                  { key: "MEDIUM", label: "Media", color: "#f59e0b", count: data.byPriority.MEDIUM ?? 0 },
                  { key: "LOW", label: "Baja", color: "#94a3b8", count: data.byPriority.LOW ?? 0 },
                ];
                const total = priorities.reduce((s, p) => s + p.count, 0);
                const maxCount = Math.max(...priorities.map((p) => p.count), 1);
                return (
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex flex-col gap-4">
                      {priorities.map((p) => {
                        const pct = total > 0 ? ((p.count / total) * 100).toFixed(1) : "0.0";
                        const barPct = maxCount > 0 ? (p.count / maxCount) * 100 : 0;
                        return (
                          <div key={p.key}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{p.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">{p.count}</span>
                                <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">{pct}%</span>
                              </div>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barPct}%`, background: p.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Total tareas</span>
                      <span className="text-xs font-bold tabular-nums text-[#5F96F9]">{total}</span>
                    </div>
                  </div>
                );
              })() : (
                <p className="flex-1 flex items-center justify-center text-sm text-slate-400">Sin datos</p>
              )}
            </div>
          </div>

          {/* Top performance ranking */}
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
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
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
        </>
      )}

      {selectedTask && (
        <TaskDetailPopup task={selectedTask} onClose={() => setSelectedTask(null)} onCommentAdded={() => {}} />
      )}

      {showCustomRange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setShowCustomRange(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-5">Seleccionar rango personalizado</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Fecha de inicio</label>
                <input type="date" value={tempFrom} onChange={(e) => setTempFrom(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Fecha de fin</label>
                <input type="date" value={tempTo} onChange={(e) => setTempTo(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowCustomRange(false)} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
              <button
                type="button"
                disabled={!tempFrom || !tempTo || tempFrom > tempTo}
                onClick={() => { setCustomFrom(tempFrom); setCustomTo(tempTo); setRangeKey("custom"); setShowCustomRange(false); }}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
