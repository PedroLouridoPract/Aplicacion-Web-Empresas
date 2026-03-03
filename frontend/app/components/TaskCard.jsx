import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const priorityStyles = {
  high: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  medium: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export default function TaskCard({ task, statuses, onMove, isDragging, currentUser, onEditTask }) {
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
        {canEdit && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEditTask(task); }}
            className="shrink-0 rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 transition hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
            title="Editar tarea"
          >
            Editar
          </button>
        )}
      </div>

      {task.description && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{task.description}</p>
      )}

      {assigneeName && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-[10px] font-bold text-white">
            {assigneeName.charAt(0).toUpperCase()}
          </span>
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
