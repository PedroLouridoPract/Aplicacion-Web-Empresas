import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import ProjectNavButtons, { NewTaskButton, ProjectLoadingSpinner, useStickyCompact, stickyTransition } from "../components/ProjectNavButtons";
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
  const { sentinelRef, compact } = useStickyCompact();
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

  const tasksByDay = useMemo(() => {
    const map = {};
    weekDays.forEach((d) => {
      map[d.toDateString()] = [];
    });

    let filtered = tasks;
    if (priorityFilter) filtered = filtered.filter((t) => (t.priority || "").toUpperCase() === priorityFilter);
    if (assigneeFilter) filtered = filtered.filter((t) => String(t.assigneeId || t.assignee?.id || "") === assigneeFilter);

    filtered.forEach((t) => {
      const dateStr = t.dueDate || t.due_date || t.createdAt;
      if (!dateStr) return;
      const taskDate = new Date(dateStr);
      const key = taskDate.toDateString();
      if (map[key]) {
        map[key].push(t);
      }
    });

    return map;
  }, [tasks, weekDays, priorityFilter, assigneeFilter]);

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
      <div ref={sentinelRef} className="h-px w-full -mb-px" />

      {compact && (
        <div className="fixed top-16 z-40 w-44 flex flex-col gap-3" style={{ left: "max(100px, calc((100vw - 1364px) / 4 - 4px))" }}>
          <Link to="/projects" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 transition hover:bg-slate-50 dark:hover:bg-slate-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <ProjectNavButtons projectId={id} current="calendar" compact />
          {filterElements(true)}
          <NewTaskButton onClick={() => setShowNewTask(true)} />
        </div>
      )}

      <div className={`sticky top-0 z-30 ${compact ? "py-3" : "flex flex-col gap-3"}`} style={stickyTransition.wrapper(compact)}>
        <div className="flex flex-wrap items-center gap-3" style={stickyTransition.navRow(compact)}>
          <Link to="/projects" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 transition hover:bg-slate-50 dark:hover:bg-slate-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="mr-auto">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Calendario</h2>
          </div>
          <ProjectNavButtons projectId={id} current="calendar" />
          <NewTaskButton onClick={() => setShowNewTask(true)} />
        </div>

        {!compact && (
          <div className="flex flex-wrap items-center gap-3 py-1">
            {filterElements(false)}
          </div>
        )}
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
          <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-700/50">
            {weekDays.map((day, i) => {
              const isToday = sameDay(day, todayDate);
              const dayTasks = tasksByDay[day.toDateString()] || [];
              return (
                <div key={i} className={`min-h-[340px] flex flex-col ${isToday ? "bg-indigo-50/30 dark:bg-indigo-500/5" : ""}`}>
                  {/* Day header */}
                  <div className="flex flex-col items-center py-3 border-b border-slate-100 dark:border-slate-700/50">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{DAY_NAMES[i]}</span>
                    <span className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      isToday
                        ? "bg-indigo-400 text-white"
                        : "text-slate-700 dark:text-slate-200"
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Tasks */}
                  <div className="flex-1 space-y-1.5 p-2">
                    {dayTasks.length === 0 && (
                      <p className="pt-4 text-center text-[10px] text-slate-300 dark:text-slate-600">Sin tareas</p>
                    )}
                    {dayTasks.map((t) => {
                      const prio = (t.priority || "MEDIUM").toUpperCase();
                      const style = PRIORITY_STYLES[prio] || PRIORITY_STYLES.MEDIUM;
                      return (
                        <div
                          key={t.id}
                          className={`rounded-lg border ${style.border} ${style.bg} p-2 transition hover:shadow-sm`}
                        >
                          <p className={`text-xs font-semibold leading-tight ${style.text} line-clamp-2`}>
                            {t.title}
                          </p>
                          {t.assignee?.name && (
                            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              → {t.assignee.name}
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 rounded-full`}
                              style={getStatusInlineColor(t) ? { backgroundColor: getStatusInlineColor(t) } : undefined}
                            />
                            <span
                              className={`text-[10px] font-medium ${getStatusColor(t) || ""}`}
                              style={getStatusInlineColor(t) ? { color: getStatusInlineColor(t) } : undefined}
                            >
                              {getStatusLabel(t)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
