import React, { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Avatar from "./Avatar";

const priorityStyles = {
  high: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  medium: "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

const priorityLabels = { high: "Alta", medium: "Media", low: "Baja" };

export default function TaskCard({ task, statuses, onMove, isDragging, currentUser, onEditTask, onDeleteTask, onTaskClick }) {
  const priorityKey = (task.priority || "medium").toLowerCase();
  const priorityClass = priorityStyles[priorityKey] || priorityStyles.medium;
  const progress = Number(task.progress) || 0;
  const assigneeName = task.assignee?.name ?? null;
  const isAdmin = currentUser?.role && String(currentUser.role).toUpperCase() === "ADMIN";
  const isMember = currentUser?.role && String(currentUser.role).toUpperCase() === "MEMBER";
  const canEdit = onEditTask && (isAdmin || isMember);
  const pointerStart = useRef(null);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: String(task.id),
    data: { task, currentStatus: task.status },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : { opacity: isDragging ? 0.5 : 1 };

  const handlePointerDown = (e) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
    if (listeners?.onPointerDown) listeners.onPointerDown(e);
  };

  const handleClick = (e) => {
    if (!onTaskClick || !pointerStart.current) return;
    const dx = Math.abs(e.clientX - pointerStart.current.x);
    const dy = Math.abs(e.clientY - pointerStart.current.y);
    if (dx < 5 && dy < 5) onTaskClick(task);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-3.5 shadow-sm transition hover:shadow-md touch-none cursor-pointer"
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 min-w-0 flex-1">{task.title}</p>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {canEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEditTask(task); }}
              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer transition"
              title="Editar"
            >
              <svg className="w-4 h-4 text-gray-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M17.37 10.17L18.71 8.75C20.13 7.25 20.77 5.54 18.56 3.45C16.35 1.37 14.68 2.1 13.26 3.6L5.05 12.29C4.74 12.62 4.44 13.27 4.38 13.72L4.01 16.96C3.88 18.13 4.72 18.93 5.88 18.73L9.1 18.18C9.55 18.1 10.18 17.77 10.49 17.43L14.44 13.25" /><path d="M11.89 5.05C12.32 7.81 14.56 9.92 17.34 10.2" /><path d="M3 22H14" /><path d="M18 22H21" /></svg>
            </button>
          )}
          {isAdmin && onDeleteTask && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDeleteTask(task); }}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer transition"
              title="Eliminar tarea"
            >
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
      </div>

      {task.description && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{task.description}</p>
      )}

      <div className="mt-2.5 flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-400 dark:text-slate-500">Asignada:</span>
          {assigneeName ? (
            <span className="flex items-center gap-1">
              <Avatar name={assigneeName} src={task.assignee?.avatarUrl} size="2xs" />
              {assigneeName}
            </span>
          ) : (
            <span>Sin asignar</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-400 dark:text-slate-500">Prioridad:</span>
          <span className={`rounded-md px-2 py-0.5 font-medium ${priorityClass}`}>{priorityLabels[priorityKey] || priorityKey}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-400 dark:text-slate-500">Fecha creación:</span>
          <span>{task.createdAt ? new Date(task.createdAt).toLocaleDateString("es-ES") : "—"}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-400 dark:text-slate-500">Fecha inicio:</span>
          <span>{task.startDate || task.start_date ? new Date(task.startDate || task.start_date).toLocaleDateString("es-ES") : "—"}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-400 dark:text-slate-500">Fecha fin:</span>
          <span>{task.due_date || task.dueDate ? new Date(task.due_date || task.dueDate).toLocaleDateString("es-ES") : "—"}</span>
        </div>
      </div>

      <div className="mt-2.5">
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-indigo-400 dark:bg-indigo-400 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

    </div>
  );
}
