import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import ProjectNavButtons, { NewTaskButton, ProjectLoadingSpinner } from "../components/ProjectNavButtons";
import CustomSelect from "../components/CustomSelect";
import NewTaskModal from "../components/NewTaskModal";

const PRIORITY_STYLES = {
  HIGH: {
    bg: "bg-indigo-100 dark:bg-indigo-500/20",
    border: "border-indigo-300 dark:border-indigo-500/40",
    text: "text-indigo-800 dark:text-indigo-200",
    dot: "bg-indigo-500",
    label: "Alta prioridad",
    btnActive: "bg-indigo-400 text-white",
    btnInactive: "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  MEDIUM: {
    bg: "bg-sky-50 dark:bg-sky-500/15",
    border: "border-sky-200 dark:border-sky-500/30",
    text: "text-sky-800 dark:text-sky-200",
    dot: "bg-sky-500",
    label: "Media prioridad",
    btnActive: "bg-sky-500 text-white",
    btnInactive: "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  LOW: {
    bg: "bg-slate-50 dark:bg-slate-700/50",
    border: "border-slate-200 dark:border-slate-600",
    text: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-400",
    label: "Baja prioridad",
    btnActive: "bg-slate-500 text-white",
    btnInactive: "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
};

const DAY_NAMES = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatWeekRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const opts = { day: "numeric", month: "long" };
  const m = monday.toLocaleDateString("es-ES", opts);
  const s = sunday.toLocaleDateString("es-ES", { ...opts, year: "numeric" });
  return `${m} – ${s}`;
}

const STATUS_KEY_MAP = {
  backlog: "backlog",
  in_progress: "in_progress",
  review: "review",
  done: "done",
};

function getTaskColumnKey(task) {
  if (task.customStatus) return task.customStatus;
  return STATUS_KEY_MAP[(task.status || "").toLowerCase()] || "backlog";
}

export default function ProjectCalendarPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const isAdmin = user?.role && String(user.role).toUpperCase() === "ADMIN";

  const columnsMap = useMemo(() => {
    const m = new Map();
    columns.forEach((c) => m.set(c.key, c));
    return m;
  }, [columns]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/projects/${id}/tasks`),
      apiFetch("/users").catch(() => []),
      apiFetch(`/projects/${id}/columns`).catch(() => []),
    ])
      .then(([tasksRes, usersRes, colsRes]) => {
        setTasks(Array.isArray(tasksRes) ? tasksRes : []);
        setUsers(Array.isArray(usersRes) ? usersRes : (usersRes?.users ?? []));
        setColumns(Array.isArray(colsRes) ? colsRes : []);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleTaskCreated() {
    const res = await apiFetch(`/projects/${id}/tasks`);
    setTasks(Array.isArray(res) ? res : []);
  }

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (priorityFilter) filtered = filtered.filter((t) => (t.priority || "").toUpperCase() === priorityFilter);
    if (assigneeFilter) filtered = filtered.filter((t) => String(t.assigneeId || t.assignee?.id || "") === assigneeFilter);
    return filtered;
  }, [tasks, priorityFilter, assigneeFilter]);

  const taskBars = useMemo(() => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const bars = [];
    filteredTasks.forEach((t) => {
      const due = t.dueDate || t.due_date;
      const created = t.createdAt || t.created_at;
      const startRaw = t.startDate || t.start_date || created;
      const endRaw = due || startRaw;
      if (!startRaw && !endRaw) return;

      let tStart = new Date(startRaw || endRaw);
      let tEnd = new Date(endRaw || startRaw);
      tStart.setHours(0, 0, 0, 0);
      tEnd.setHours(0, 0, 0, 0);
      if (tStart > tEnd) { const tmp = tStart; tStart = tEnd; tEnd = tmp; }

      const wStart = new Date(weekStart); wStart.setHours(0, 0, 0, 0);
      const wEnd = new Date(weekEnd); wEnd.setHours(0, 0, 0, 0);

      if (tEnd < wStart || tStart > wEnd) return;

      const clampedStart = tStart < wStart ? wStart : tStart;
      const clampedEnd = tEnd > wEnd ? wEnd : tEnd;

      const colStart = Math.round((clampedStart - wStart) / 86400000);
      const colEnd = Math.round((clampedEnd - wStart) / 86400000);
      const span = colEnd - colStart + 1;

      bars.push({ task: t, colStart, span });
    });

    bars.sort((a, b) => a.colStart - b.colStart || b.span - a.span);

    const rows = [];
    const barRows = [];
    bars.forEach((bar) => {
      let placed = false;
      for (let r = 0; r < rows.length; r++) {
        if (rows[r] <= bar.colStart) {
          rows[r] = bar.colStart + bar.span;
          barRows.push({ ...bar, row: r });
          placed = true;
          break;
        }
      }
      if (!placed) {
        rows.push(bar.colStart + bar.span);
        barRows.push({ ...bar, row: rows.length - 1 });
      }
    });

    const rowHeights = new Array(rows.length).fill(44);
    barRows.forEach((b) => {
      const h = b.span === 1 ? 64 : 44;
      if (h > rowHeights[b.row]) rowHeights[b.row] = h;
    });
    const rowTops = [];
    let cumTop = 0;
    for (let i = 0; i < rowHeights.length; i++) {
      rowTops.push(cumTop);
      cumTop += rowHeights[i];
    }
    return { bars: barRows, totalRows: rows.length, totalHeight: cumTop, rowTops, rowHeights };
  }, [filteredTasks, weekStart]);

  const todayDate = new Date();

  function prevWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function nextWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  function goToday() {
    setWeekStart(getMonday(new Date()));
  }

  const BASE_LABEL = { backlog: "Backlog", in_progress: "En proceso", review: "En revisión", done: "Finalizado" };
  const BASE_COLOR = { backlog: "text-slate-400", in_progress: "text-blue-500", review: "text-amber-500", done: "text-emerald-500" };

  const getStatusLabel = (task) => {
    const key = getTaskColumnKey(task);
    const col = columnsMap.get(key);
    if (col) return col.label;
    return BASE_LABEL[key] || key;
  };

  const getStatusColor = (task) => {
    const key = getTaskColumnKey(task);
    const col = columnsMap.get(key);
    if (col?.color) return null;
    return BASE_COLOR[key] || "text-slate-400";
  };

  const getStatusInlineColor = (task) => {
    const key = getTaskColumnKey(task);
    const col = columnsMap.get(key);
    return col?.color || null;
  };

  const filterElements = (vertical) => (
    <>
      <CustomSelect
        value={priorityFilter || ""}
        onChange={(val) => setPriorityFilter(val || null)}
        options={[{ value: "", label: "Todas las prioridades" }, ...Object.entries(PRIORITY_STYLES).map(([key, style]) => ({ value: key, label: style.label }))]}
        placeholder="Todas las prioridades"
        size="sm"
      />
      <CustomSelect
        value={assigneeFilter}
        onChange={(val) => setAssigneeFilter(val)}
        options={[{ value: "", label: "Todos los miembros" }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
        placeholder="Todos los miembros"
        size="sm"
      />
      {(priorityFilter || assigneeFilter) && (
        <button type="button" onClick={() => { setPriorityFilter(null); setAssigneeFilter(""); }} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200">Limpiar</button>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/projects" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 transition hover:bg-slate-50 dark:hover:bg-slate-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="mr-auto">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Calendario</h2>
          </div>
          <ProjectNavButtons projectId={id} current="calendar" />
          <NewTaskButton onClick={() => setShowNewTask(true)} />
        </div>

        <div className="flex flex-wrap items-center gap-3 py-1">
          {filterElements(false)}
        </div>
      </div>

      <NewTaskModal
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        projectId={id}
        users={users}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        onCreated={handleTaskCreated}
      />

      {/* Week navigation */}
      <div className="content-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 px-5 py-3">
          <button type="button" onClick={prevWeek} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize">{formatWeekRange(weekStart)}</span>
            <button type="button" onClick={goToday} className="rounded-md bg-indigo-50 dark:bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 transition hover:bg-indigo-100 dark:hover:bg-indigo-500/25">
              Hoy
            </button>
          </div>
          <button type="button" onClick={nextWeek} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {loading ? (
          <ProjectLoadingSpinner />
        ) : (
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-700/50">
              {weekDays.map((day, i) => {
                const isToday = sameDay(day, todayDate);
                return (
                  <div key={i} className={`flex flex-col items-center py-3 ${isToday ? "bg-indigo-50/30 dark:bg-indigo-500/5" : ""}`}>
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{DAY_NAMES[i]}</span>
                    <span className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      isToday ? "bg-indigo-400 text-white" : "text-slate-700 dark:text-slate-200"
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700/50" />

            {/* Task bars area */}
            <div className="relative" style={{ minHeight: Math.max(200, (taskBars.totalHeight || 0) + 16) }}>
              {/* Column grid lines */}
              <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                {weekDays.map((day, i) => {
                  const isToday = sameDay(day, todayDate);
                  return (
                    <div key={i} className={`${i > 0 ? "border-l border-slate-100 dark:border-slate-700/50" : ""} ${isToday ? "bg-indigo-50/20 dark:bg-indigo-500/5" : ""}`} />
                  );
                })}
              </div>

              {/* Task bars */}
              <div className="relative px-1 pt-2 pb-2">
                {taskBars.bars.length === 0 && (
                  <p className="py-16 text-center text-sm text-slate-300 dark:text-slate-600">Sin tareas esta semana</p>
                )}
                {taskBars.bars.map(({ task: t, colStart, span, row }) => {
                  const prio = (t.priority || "MEDIUM").toUpperCase();
                  const style = PRIORITY_STYLES[prio] || PRIORITY_STYLES.MEDIUM;
                  const leftPct = (colStart / 7) * 100;
                  const widthPct = (span / 7) * 100;
                  const isSingleDay = span === 1;
                  const barH = isSingleDay ? 56 : 36;
                  return (
                    <div
                      key={t.id}
                      className={`absolute rounded-lg border ${style.border} ${style.bg} px-3 transition hover:shadow-md cursor-default overflow-hidden ${isSingleDay ? "py-2" : "py-1.5"}`}
                      style={{
                        top: (taskBars.rowTops[row] || 0) + 8,
                        left: `calc(${leftPct}% + 4px)`,
                        width: `calc(${widthPct}% - 8px)`,
                        height: barH,
                      }}
                    >
                      {isSingleDay ? (
                        <div className="flex flex-col gap-0.5 h-full min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={getStatusInlineColor(t) ? { backgroundColor: getStatusInlineColor(t) } : undefined}
                            />
                            <p className={`text-xs font-semibold ${style.text} truncate`}>{t.title}</p>
                          </div>
                          {t.assignee?.name && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate pl-4">Asignado: {t.assignee.name}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 h-full min-w-0">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={getStatusInlineColor(t) ? { backgroundColor: getStatusInlineColor(t) } : undefined}
                          />
                          <p className={`text-xs font-semibold ${style.text} truncate`}>{t.title}</p>
                          {t.assignee?.name && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate shrink-0 ml-auto">Asignado: {t.assignee.name}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 px-5 py-2.5">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {tasks.length} tarea{tasks.length !== 1 ? "s" : ""} en total
          </span>
          <Link
            to={`/projects/${id}`}
            className="text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 transition"
          >
            ← Volver al proyecto
          </Link>
        </div>
      </div>
    </div>
  );
}
