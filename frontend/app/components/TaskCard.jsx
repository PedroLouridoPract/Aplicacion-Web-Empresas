import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const priorityStyles = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-600",
};

export default function TaskCard({ task, statuses, onMove, isDragging }) {
  const priorityClass = priorityStyles[task.priority] || priorityStyles.medium;
  const progress = Number(task.progress) || 0;

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
      className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md touch-none"
      {...attributes}
      {...listeners}
    >
      <p className="font-medium text-slate-800">{task.title}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-lg px-2 py-0.5 font-medium ${priorityClass}`}>
          {task.priority}
        </span>
        <span className="text-slate-500">
          Vence: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "-"}
        </span>
      </div>

      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">{progress}%</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {statuses
          .filter((s) => s.key !== task.status)
          .map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={(e) => { e.stopPropagation(); onMove(task.id, s.key); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              title={`Mover a ${s.label}`}
            >
              → {s.label}
            </button>
          ))}
      </div>
    </div>
  );
}
