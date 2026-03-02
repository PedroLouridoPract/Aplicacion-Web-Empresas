import React, { useEffect, useState } from "react";
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
import { apiFetch } from "../api/http";

const kpiConfig = [
  { key: "overdue", label: "Atrasadas", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", num: "text-red-600" },
  { key: "backlog", label: "Backlog", bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", num: "text-slate-800" },
  { key: "in_progress", label: "En progreso", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", num: "text-amber-600" },
  { key: "done", label: "Finalizadas", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", num: "text-emerald-600" },
];

const STATUS_COLORS = {
  overdue: "#ef4444",
  backlog: "#64748b",
  in_progress: "#f59e0b",
  done: "#10b981",
};

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [prod, setProd] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, p] = await Promise.all([
          apiFetch("/dashboard/summary"),
          apiFetch("/dashboard/productivity"),
        ]);
        setSummary(s);
        setProd(p);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const chartData = summary
    ? [
        { name: "Atrasadas", value: summary.overdue ?? 0, fill: STATUS_COLORS.overdue },
        { name: "Backlog", value: summary.backlog ?? 0, fill: STATUS_COLORS.backlog },
        { name: "En progreso", value: summary.in_progress ?? 0, fill: STATUS_COLORS.in_progress },
        { name: "Finalizadas", value: summary.done ?? 0, fill: STATUS_COLORS.done },
      ]
    : [];

  const prodChartData = prod.map((u) => ({
    name: u.name,
    Hechas: u.done ?? 0,
    "En curso": u.in_progress ?? 0,
    Atrasadas: u.overdue ?? 0,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Resumen de tareas y productividad</p>
      </div>

      {loading && (
        <div className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm border border-slate-200/80">
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
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Tareas por estado</h2>
          <p className="mt-1 text-sm text-slate-500">Distribución actual</p>
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

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Productividad por usuario</h2>
        <p className="mt-1 text-sm text-slate-500">Tareas completadas, en curso y atrasadas</p>
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
          {prod.map((u) => (
            <div
              key={u.user_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
            >
              <span className="font-medium text-slate-800">{u.name}</span>
              <span className="flex gap-4 text-sm">
                <span className="text-emerald-600 font-medium">Hechas: {u.done}</span>
                <span className="text-amber-600">En curso: {u.in_progress}</span>
                <span className="text-red-600">Atrasadas: {u.overdue}</span>
              </span>
            </div>
          ))}
          {!prod.length && !loading && (
            <p className="py-8 text-center text-sm text-slate-500">Sin datos todavía</p>
          )}
        </div>
      </div>
    </div>
  );
}
