import React from "react";
import { useDroppable } from "@dnd-kit/core";
import TaskCard from "./TaskCard";

const columnStyles = {
  backlog: "border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/80",
  in_progress: "border-amber-200/80 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/10",
  review: "border-blue-200/80 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-500/10",
  done: "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/10",
};

export default function KanbanColumn({ title, statusKey, tasks, statuses, onMove, activeId, currentUser, onEditTask }) {
  const style = columnStyles[statusKey] || columnStyles.backlog;

  const { setNodeRef, isOver } = useDroppable({ id: statusKey });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border ${style} p-4 shadow-sm min-h-[280px] transition ${
        isOver ? "ring-2 ring-indigo-400 ring-offset-2" : ""
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <span className="rounded-full bg-white/80 dark:bg-slate-700/80 px-2.5 py-0.5 text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            statuses={statuses}
            onMove={onMove}
            isDragging={activeId === String(t.id)}
            currentUser={currentUser}
            onEditTask={onEditTask}
          />
        ))}
      </div>
    </div>
  );
}
