import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";

const kpiConfig = [
  { key: "overdue", label: "Atrasadas", bg: "bg-red-50 dark:bg-red-500/15", border: "border-red-200 dark:border-red-500/30", text: "text-red-700 dark:text-red-200", num: "text-red-600 dark:text-red-400" },
  { key: "backlog", label: "Backlog", bg: "bg-slate-50 dark:bg-slate-800/50", border: "border-slate-200 dark:border-slate-700", text: "text-slate-600 dark:text-slate-300", num: "text-slate-800 dark:text-slate-100" },
  { key: "in_progress", label: "En progreso", bg: "bg-amber-50 dark:bg-amber-500/15", border: "border-amber-200 dark:border-amber-500/30", text: "text-amber-700 dark:text-amber-200", num: "text-amber-600 dark:text-amber-400" },
  { key: "done", label: "Finalizadas", bg: "bg-emerald-50 dark:bg-emerald-500/15", border: "border-emerald-200 dark:border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-200", num: "text-emerald-600 dark:text-emerald-400" },
];

const STATUS_COLORS = {
  overdue: "#ef4444",
  backlog: "#64748b",
  in_progress: "#f59e0b",
  done: "#10b981",
};

export default function DashboardPage() {
  const { user, booting } = useAuth();
  const role = (user?.role && String(user.role).toUpperCase()) || "";
  const isAdmin = role === "ADMIN";

  const [summary, setSummary] = useState(null);
  const [prod, setProd] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (booting || !user) {
      setLoading(false);
      return;
    }
    if (!isAdmin) {
      setLoading(false);
      setForbidden(false);
      return;
    }
    setForbidden(false);
    async function load() {
      setLoading(true);
      try {
        const [s, p] = await Promise.all([
          apiFetch("/dashboard/summary"),
          apiFetch("/dashboard/productivity"),
        ]);
        setSummary(s);
        setProd(Array.isArray(p) ? p : (p?.perUser ?? []));
      } catch (err) {
        if (err?.status === 403) setForbidden(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [booting, user, isAdmin]);

  const chartData = summary
    ? [
        { name: "Atrasadas", value: summary.overdue ?? 0, fill: STATUS_COLORS.overdue },
        { name: "Backlog", value: summary.backlog ?? 0, fill: STATUS_COLORS.backlog },
        { name: "En progreso", value: summary.in_progress ?? 0, fill: STATUS_COLORS.in_progress },
        { name: "Finalizadas", value: summary.done ?? 0, fill: STATUS_COLORS.done },
      ]
    : [];

  const prodList = Array.isArray(prod) ? prod : [];
  const prodChartData = prodList.map((item) => {
    const u = item.user ?? item;
    const m = item.metrics ?? item;
    return {
      name: u.name ?? "Sin nombre",
      Hechas: m.doneLastNDays ?? m.done ?? 0,
      "En curso": m.inProgressNow ?? m.in_progress ?? 0,
      Atrasadas: m.overdueNow ?? m.overdue ?? 0,
    };
  });

  if (!isAdmin || forbidden) {
    return <Navigate to="/my-tasks" replace />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Resumen de tareas y productividad (solo administradores)</p>
      </div>

      {loading && (
        <div className="rounded-xl bg-white dark:bg-slate-800 px-5 py-4 text-sm text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200/80 dark:border-slate-700">
          Cargando...
        </div>
      )}

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiConfig.map(({ key, label, bg, border, text, num }) => (
            <div
              key={key}
              className={`rounded-2xl border ${border} ${bg} p-6 shadow-sm transition hover:shadow-md`}
            >
              <p className={`text-sm font-medium ${text}`}>{label}</p>
              <p className={`mt-2 text-4xl font-bold tabular-nums ${num}`}>
                {summary[key] ?? 0}
              </p>
            </div>
          ))}
        </div>
      )}

      {summary && chartData.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tareas por estado</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Distribución actual</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Productividad por usuario</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tareas completadas, en curso y atrasadas</p>
        {prodChartData.length > 0 ? (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prodChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Hechas" stackId="a" fill="#10b981" />
                <Bar dataKey="En curso" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Atrasadas" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
        <div className="mt-5 flex flex-col gap-3">
          {prodList.map((item) => {
            const u = item.user ?? item;
            const m = item.metrics ?? item;
            const done = m.doneLastNDays ?? m.done ?? 0;
            const inProgress = m.inProgressNow ?? m.in_progress ?? 0;
            const overdue = m.overdueNow ?? m.overdue ?? 0;
            return (
              <div
                key={u.id ?? u.user_id ?? Math.random()}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-700/50 px-4 py-3"
              >
                <span className="font-medium text-slate-800 dark:text-slate-100">{u.name}</span>
                <span className="flex gap-4 text-sm">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Hechas: {done}</span>
                  <span className="text-amber-600 dark:text-amber-400">En curso: {inProgress}</span>
                  <span className="text-red-600 dark:text-red-400">Atrasadas: {overdue}</span>
                </span>
              </div>
            );
          })}
          {!prodList.length && !loading && (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Sin datos todavía</p>
          )}
        </div>
      </div>
    </div>
  );
}
