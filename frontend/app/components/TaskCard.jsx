import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const priorityStyles = {
  high: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export default function TaskCard({ task, statuses, onMove, isDragging, currentUser, onEditTask }) {
  const priorityKey = (task.priority || "medium").toLowerCase();
  const priorityClass = priorityStyles[priorityKey] || priorityStyles.medium;
  const progress = Number(task.progress) || 0;
  const assigneeName = task.assignee?.name ?? null;
  const assigneeId = task.assigneeId ?? task.assignee?.id;
  const isAdmin = currentUser?.role && String(currentUser.role).toUpperCase() === "ADMIN";
  const isAssignee = currentUser?.id && assigneeId === currentUser.id;
  const canEdit = onEditTask && (isAdmin || isAssignee);

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
      className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition hover:shadow-md touch-none"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-slate-800 dark:text-slate-100 min-w-0 flex-1">{task.title}</p>
        {canEdit && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEditTask(task); }}
            className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            title="Editar tarea"
          >
            Editar
          </button>
        )}
      </div>

      {task.description && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{task.description}</p>
      )}

      {assigneeName && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          Asignado a: <span className="font-medium text-slate-600 dark:text-slate-300">{assigneeName}</span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-lg px-2 py-0.5 font-medium ${priorityClass}`}>
          {(task.priority || "medium").toLowerCase()}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          Vence: {task.due_date || task.dueDate ? new Date(task.due_date || task.dueDate).toLocaleDateString() : "-"}
        </span>
      </div>

      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{progress}%</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {statuses
          .filter((s) => s.key !== task.status)
          .map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={(e) => { e.stopPropagation(); onMove(task.id, s.key); }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700"
              title={`Mover a ${s.label}`}
            >
              → {s.label}
            </button>
          ))}
      </div>
    </div>
  );
}
