import React, { useEffect, useState, useMemo, useRef } from "react";
import { Navigate } from "react-router-dom";
import {
  BarChart,
  Bar,
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
  Legend,
} from "recharts";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import Avatar from "../components/Avatar";

const BASE_COLUMN_COLORS = {
  backlog: "#94a3b8",
  in_progress: "#3b82f6",
  review: "#f59e0b",
  done: "#10b981",
};

const PRIORITY_COLORS = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#94a3b8" };
const PRIORITY_LABELS = { HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" };

const FALLBACK_COLORS = [
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4",
  "#84cc16", "#e11d48", "#6366f1", "#22d3ee", "#a855f7",
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
                style={{ background: p.color || "#6366f1" }}
              />
              <span className="truncate">{p.name}</span>
            </button>
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
  const [days, setDays] = useState(30);

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

  const columnChartData = useMemo(() => {
    if (!data?.byColumn) return [];
    return data.byColumn.map((c, i) => ({
      name: c.label,
      Tareas: c.count,
      fill: getColumnColor(c, i),
    }));
  }, [data]);

  const priorityChartData = useMemo(() => {
    if (!data?.byPriority) return [];
    return Object.entries(data.byPriority).map(([k, v]) => ({
      name: PRIORITY_LABELS[k] || k,
      value: v,
    }));
  }, [data]);

  const trendData = useMemo(() => {
    if (!data?.trend) return [];
    return data.trend.map((t) => ({
      date: t.date.slice(5),
      Creadas: t.created,
      Completadas: t.completed,
    }));
  }, [data]);

  if (!isAdmin) return <Navigate to="/my-tasks" replace />;

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

  const pieColors = ["#ef4444", "#f59e0b", "#94a3b8"];
  const priorityTotal = priorityChartData.reduce((s, d) => s + d.value, 0);

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

          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {[
              { d: 7, label: "7d" },
              { d: 14, label: "14d" },
              { d: 30, label: "30d" },
              { d: 90, label: "90d" },
            ].map(({ d, label }) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  days === d
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

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

          {/* Charts row: Column distribution + Priority */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="content-card p-6 lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Distribución por columna</h3>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Tareas en cada estado del Kanban</p>
              {columnChartData.length > 0 ? (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={columnChartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.8rem" }} />
                      <Bar dataKey="Tareas" radius={[4, 4, 0, 0]}>
                        {columnChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-8 text-center text-sm text-slate-400">Sin datos</p>
              )}
            </div>

            <div className="content-card p-6">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Por prioridad</h3>
              {priorityTotal > 0 ? (
                <div className="mt-3 flex flex-col items-center gap-4">
                  <div className="h-44 w-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={priorityChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={65}
                          strokeWidth={2}
                          stroke="#fff"
                        >
                          {priorityChartData.map((_, i) => (
                            <Cell key={i} fill={pieColors[i]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.8rem" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2 text-sm w-full">
                    {priorityChartData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: pieColors[i] }} />
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

          {/* Trend chart */}
          <div className="content-card p-6">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tendencia</h3>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Tareas creadas vs completadas por día</p>
            {trendData.length > 0 ? (
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradDone" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.8rem" }} />
                    <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "0.75rem" }} />
                    <Area type="monotone" dataKey="Creadas" stroke="#6366f1" strokeWidth={2} fill="url(#gradCreated)" />
                    <Area type="monotone" dataKey="Completadas" stroke="#10b981" strokeWidth={2} fill="url(#gradDone)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-8 text-center text-sm text-slate-400">Sin datos</p>
            )}
          </div>

          {/* Users table */}
          {data?.byUser?.length > 0 && (
            <div className="content-card p-6">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Rendimiento por usuario</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Usuario</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Total</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Hechas</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">En curso</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Atrasadas</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Progreso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.byUser.map((row) => {
                      const pct = row.total > 0 ? Math.round((row.done / row.total) * 100) : 0;
                      return (
                        <tr key={row.user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={row.user.name} src={row.user.avatarUrl} size="xs" />
                              <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
                                {row.user.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums font-medium text-slate-700 dark:text-slate-200">
                            {row.total}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                            {row.done}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums font-medium text-blue-600 dark:text-blue-400">
                            {row.inProgress}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums font-medium text-red-600 dark:text-red-400">
                            {row.overdue}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                <div
                                  className="h-full rounded-full bg-emerald-500 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-8 text-right text-xs tabular-nums font-semibold text-slate-500 dark:text-slate-400">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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

    </div>
  );
}
