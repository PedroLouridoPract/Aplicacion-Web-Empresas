import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Avatar from "./Avatar";

const priorityStyles = {
  high: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  medium: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export default function TaskCard({ task, statuses, onMove, isDragging, currentUser, onEditTask, onDeleteTask }) {
  const priorityKey = (task.priority || "medium").toLowerCase();
  const priorityClass = priorityStyles[priorityKey] || priorityStyles.medium;
  const progress = Number(task.progress) || 0;
  const assigneeName = task.assignee?.name ?? null;
  const assigneeId = task.assigneeId ?? task.assignee?.id;
  const isAdmin = currentUser?.role && String(currentUser.role).toUpperCase() === "ADMIN";
  const isMember = currentUser?.role && String(currentUser.role).toUpperCase() === "MEMBER";
  const canEdit = onEditTask && (isAdmin || isMember);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: String(task.id),
    data: { task, currentStatus: task.status },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : { opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-3.5 shadow-sm transition hover:shadow-md touch-none"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 min-w-0 flex-1">{task.title}</p>
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEditTask(task); }}
              className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 transition hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
              title="Editar tarea"
            >
              Editar
            </button>
          )}
          {isAdmin && onDeleteTask && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDeleteTask(task); }}
              className="rounded-md bg-red-50 p-1 text-red-500 transition hover:bg-red-100 hover:text-red-700 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/25"
              title="Eliminar tarea"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
      </div>

      {task.description && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{task.description}</p>
      )}

      {assigneeName && (
        <div className="mt-2 flex items-center gap-1.5">
          <Avatar name={assigneeName} src={task.assignee?.avatarUrl} size="2xs" />
          <span className="text-xs text-slate-500 dark:text-slate-400">{assigneeName}</span>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
        <span className={`rounded-md px-2 py-0.5 font-medium ${priorityClass}`}>
          {(task.priority || "medium").toLowerCase()}
        </span>
        <span className="text-amber-600 dark:text-amber-400 font-medium" title="Fecha límite">
          {task.due_date || task.dueDate ? new Date(task.due_date || task.dueDate).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
        </span>
        {task.createdAt && (
          <span className="text-indigo-500 dark:text-indigo-400 font-medium" title="Fecha de creación">
            {new Date(task.createdAt).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div className="mt-2.5">
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1">
        {statuses
          .filter((s) => s.key !== task.status)
          .map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={(e) => { e.stopPropagation(); onMove(task.id, s.key); }}
              className="rounded-md bg-slate-50 dark:bg-slate-700/50 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              title={`Mover a ${s.label}`}
            >
              {s.label}
            </button>
          ))}
      </div>
    </div>
  );
}
