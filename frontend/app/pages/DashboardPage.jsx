import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
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
} from "recharts";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import Avatar from "../components/Avatar";

const kpiConfig = [
  {
    key: "done",
    label: "Finalizadas",
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "in_progress",
    label: "En progreso",
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    key: "backlog",
    label: "Backlog",
    iconBg: "bg-slate-100 dark:bg-slate-700",
    iconColor: "text-slate-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
  },
  {
    key: "overdue",
    label: "Atrasadas",
    iconBg: "bg-red-50 dark:bg-red-500/10",
    iconColor: "text-red-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const STATUS_COLORS = {
  overdue: "#ef4444",
  backlog: "#94a3b8",
  in_progress: "#3b82f6",
  done: "#10b981",
};

const PIE_COLORS = ["#10b981", "#3b82f6", "#94a3b8", "#ef4444"];

export default function DashboardPage() {
  const { user, booting } = useAuth();
  const role = (user?.role && String(user.role).toUpperCase()) || "";
  const isAdmin = role === "ADMIN";

  const [summary, setSummary] = useState(null);
  const [prodBar, setProdBar] = useState([]);
  const [prodArea, setProdArea] = useState([]);
  const [prodTotal, setProdTotal] = useState([]);
  const [pieSummary, setPieSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [barPeriod, setBarPeriod] = useState("monthly");
  const [areaPeriod, setAreaPeriod] = useState("monthly");
  const [piePeriod, setPiePeriod] = useState("monthly");

  const periodDays = { weekly: 7, monthly: 30, total: 365 };

  useEffect(() => {
    if (booting || !user) { setLoading(false); return; }
    if (!isAdmin) { setLoading(false); setForbidden(false); return; }
    setForbidden(false);
    async function load() {
      setLoading(true);
      try {
        const [s, p, pTotal] = await Promise.all([
          apiFetch("/dashboard/summary"),
          apiFetch(`/dashboard/productivity?days=30`),
          apiFetch(`/dashboard/productivity?days=365`),
        ]);
        setSummary(s);
        setPieSummary(s);
        const list = Array.isArray(p) ? p : (p?.perUser ?? []);
        setProdBar(list);
        setProdArea(list);
        setProdTotal(Array.isArray(pTotal) ? pTotal : (pTotal?.perUser ?? []));
      } catch (err) {
        if (err?.status === 403) setForbidden(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [booting, user, isAdmin]);

  useEffect(() => {
    if (!isAdmin || !summary) return;
    let cancelled = false;
    apiFetch(`/dashboard/productivity?days=${periodDays[barPeriod]}`)
      .then((p) => { if (!cancelled) setProdBar(Array.isArray(p) ? p : (p?.perUser ?? [])); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [barPeriod]);

  useEffect(() => {
    if (!isAdmin || !summary) return;
    let cancelled = false;
    apiFetch(`/dashboard/productivity?days=${periodDays[areaPeriod]}`)
      .then((p) => { if (!cancelled) setProdArea(Array.isArray(p) ? p : (p?.perUser ?? [])); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [areaPeriod]);

  useEffect(() => {
    if (!isAdmin || !summary) return;
    let cancelled = false;
    apiFetch(`/dashboard/summary?days=${periodDays[piePeriod]}`)
      .then((s) => { if (!cancelled) setPieSummary(s); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [piePeriod]);

  const total = summary ? (summary.done ?? 0) + (summary.in_progress ?? 0) + (summary.backlog ?? 0) + (summary.overdue ?? 0) : 0;

  const pieTotal = pieSummary ? (pieSummary.done ?? 0) + (pieSummary.in_progress ?? 0) + (pieSummary.backlog ?? 0) + (pieSummary.overdue ?? 0) : 0;
  const chartData = pieSummary
    ? [
        { name: "Finalizadas", value: pieSummary.done ?? 0 },
        { name: "En progreso", value: pieSummary.in_progress ?? 0 },
        { name: "Backlog", value: pieSummary.backlog ?? 0 },
        { name: "Atrasadas", value: pieSummary.overdue ?? 0 },
      ]
    : [];

  const barList = Array.isArray(prodBar) ? prodBar : [];
  const prodChartData = barList.map((item) => {
    const u = item.user ?? item;
    const m = item.metrics ?? item;
    return {
      name: (u.name ?? "Sin nombre").split(" ")[0],
      Hechas: m.doneLastNDays ?? m.done ?? 0,
      "En curso": m.inProgressNow ?? m.in_progress ?? 0,
      Atrasadas: m.overdueNow ?? m.overdue ?? 0,
    };
  });

  const areaList = Array.isArray(prodArea) ? prodArea : [];
  const areaChartData = areaList.map((item) => {
    const u = item.user ?? item;
    const m = item.metrics ?? item;
    return {
      name: (u.name ?? "?").split(" ")[0],
      Completadas: m.doneLastNDays ?? m.done ?? 0,
      Activas: m.inProgressNow ?? m.in_progress ?? 0,
    };
  });

  const prodList = (Array.isArray(prodTotal) ? prodTotal : [])
    .slice()
    .sort((a, b) => {
      const aDone = (a.metrics ?? a).doneLastNDays ?? (a.metrics ?? a).done ?? 0;
      const bDone = (b.metrics ?? b).doneLastNDays ?? (b.metrics ?? b).done ?? 0;
      return bDone - aDone;
    });

  if (!isAdmin || forbidden) {
    return <Navigate to="/my-tasks" replace />;
  }

  return (
    <div className="flex flex-col gap-6">
      {loading && (
        <div className="content-card px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          Cargando...
        </div>
      )}

      {/* KPI Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiConfig.map(({ key, label, iconBg, iconColor, icon }) => {
            const value = summary[key] ?? 0;
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
            return (
              <div
                key={key}
                className="content-card flex items-center justify-between p-5"
              >
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {value}
                  </p>
                  <p className={`mt-0.5 text-xs font-medium ${
                    key === "overdue" ? "text-red-500" : key === "done" ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"
                  }`}>
                    {pct}% del total
                  </p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
                  {icon}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts row */}
      {summary && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Bar chart - Productivity */}
          <div className="content-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Productividad del equipo</h2>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Tareas por usuario</p>
              </div>
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {[{ key: "weekly", label: "Semanal" }, { key: "monthly", label: "Mensual" }, { key: "total", label: "Total" }].map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => setBarPeriod(key)}
                    className={`px-2.5 py-1 text-[11px] font-medium transition ${barPeriod === key ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                  >{label}</button>
                ))}
              </div>
            </div>
            {prodChartData.length > 0 ? (
              <div className="mt-4 h-56" key={barPeriod}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prodChartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}
                    />
                    <Bar dataKey="Hechas" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="En curso" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Atrasadas" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-8 text-center text-sm text-slate-400">Sin datos</p>
            )}
          </div>

          {/* Area chart */}
          <div className="content-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Actividad por miembro</h2>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Completadas vs activas</p>
              </div>
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {[{ key: "weekly", label: "Semanal" }, { key: "monthly", label: "Mensual" }, { key: "total", label: "Total" }].map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => setAreaPeriod(key)}
                    className={`px-2.5 py-1 text-[11px] font-medium transition ${areaPeriod === key ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                  >{label}</button>
                ))}
              </div>
            </div>
            {areaChartData.length > 0 ? (
              <div className="mt-4 h-56" key={areaPeriod}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaChartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}
                    />
                    <Area type="monotone" dataKey="Completadas" stroke="#10b981" strokeWidth={2} fill="url(#gradCompleted)" />
                    <Area type="monotone" dataKey="Activas" stroke="#3b82f6" strokeWidth={2} fill="url(#gradActive)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-8 text-center text-sm text-slate-400">Sin datos</p>
            )}
          </div>
        </div>
      )}

      {/* Bottom row */}
      {summary && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Pie chart - Distribution */}
          <div className="content-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Distribución por estado</h2>
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {[{ key: "weekly", label: "7d" }, { key: "monthly", label: "30d" }, { key: "total", label: "Todo" }].map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => setPiePeriod(key)}
                    className={`px-2 py-1 text-[10px] font-medium transition ${piePeriod === key ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                  >{label}</button>
                ))}
              </div>
            </div>
            {chartData.length > 0 && pieTotal > 0 ? (
              <div className="mt-3 flex items-center gap-4">
                <div className="h-40 w-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={65}
                        strokeWidth={2}
                        stroke="#fff"
                      >
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.8rem" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2.5 text-sm">
                  {chartData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
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

          {/* Top users - Productivity ranking */}
          <div className="content-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Top productividad</h2>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Tareas completadas por usuario</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {prodList.slice(0, 5).map((item, idx) => {
                const u = item.user ?? item;
                const m = item.metrics ?? item;
                const done = m.doneLastNDays ?? m.done ?? 0;
                const maxDone = Math.max((prodList[0]?.metrics ?? prodList[0])?.doneLastNDays ?? (prodList[0]?.metrics ?? prodList[0])?.done ?? 0, 1);
                const pct = Math.round((done / maxDone) * 100);
                return (
                  <div key={u.id ?? u.user_id ?? u.name} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {idx + 1}
                    </span>
                    <Avatar name={u.name} src={u.avatarUrl} size="xs" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium text-slate-700 dark:text-slate-200">{u.name}</span>
                        <span className="ml-2 shrink-0 tabular-nums text-xs font-semibold text-emerald-600 dark:text-emerald-400">{done}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {!prodList.length && (
                <p className="py-4 text-center text-sm text-slate-400">Sin datos</p>
              )}
            </div>
          </div>

          {/* Team members working */}
          <div className="content-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Equipo activo</h2>
              <Link to="/users" className="text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400">
                Ver todos
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {prodList.slice(0, 5).map((item) => {
                const u = item.user ?? item;
                const m = item.metrics ?? item;
                const inProgress = m.inProgressNow ?? m.in_progress ?? 0;
                return (
                  <div key={u.id ?? u.user_id ?? u.name} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{u.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {inProgress > 0 ? `${inProgress} tarea${inProgress > 1 ? "s" : ""} activa${inProgress > 1 ? "s" : ""}` : "Sin tareas activas"}
                      </p>
                    </div>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${inProgress > 0 ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-600"}`} />
                  </div>
                );
              })}
              {!prodList.length && (
                <p className="py-4 text-center text-sm text-slate-400">Sin datos</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
