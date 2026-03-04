import React from "react";
import { useDroppable } from "@dnd-kit/core";
import TaskCard from "./TaskCard";

const columnStyles = {
  backlog: "border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/60",
  in_progress: "border-amber-200/60 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/5",
  review: "border-indigo-200/60 bg-indigo-50/40 dark:border-indigo-500/20 dark:bg-indigo-500/5",
  done: "border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5",
};

export default function KanbanColumn({ title, statusKey, tasks, statuses, onMove, activeId, currentUser, onEditTask, onDeleteTask, onTaskClick }) {
  const style = columnStyles[statusKey] || columnStyles.backlog;

  const { setNodeRef, isOver } = useDroppable({ id: statusKey });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border ${style} p-3.5 min-h-[280px] transition ${
        isOver ? "ring-2 ring-indigo-400 ring-offset-2" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/80 dark:bg-slate-700/80 px-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            statuses={statuses}
            onMove={onMove}
            isDragging={activeId === String(t.id)}
            currentUser={currentUser}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
}
