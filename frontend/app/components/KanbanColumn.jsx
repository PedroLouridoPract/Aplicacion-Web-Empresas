import React, { useCallback, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TaskCard from "./TaskCard";

const columnStyles = {
  backlog: "border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/60",
  in_progress: "border-amber-200/60 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/5",
  review: "border-indigo-200/60 bg-indigo-50/40 dark:border-indigo-500/20 dark:bg-indigo-400/5",
  done: "border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5",
};

const CUSTOM_COLORS = {
  blue: "border-blue-200/60 bg-blue-50/40 dark:border-blue-500/20 dark:bg-blue-500/5",
  purple: "border-purple-200/60 bg-purple-50/40 dark:border-purple-500/20 dark:bg-purple-500/5",
  pink: "border-pink-200/60 bg-pink-50/40 dark:border-pink-500/20 dark:bg-pink-500/5",
  orange: "border-orange-200/60 bg-orange-50/40 dark:border-orange-500/20 dark:bg-orange-500/5",
  teal: "border-teal-200/60 bg-teal-50/40 dark:border-teal-500/20 dark:bg-teal-500/5",
  cyan: "border-cyan-200/60 bg-cyan-50/40 dark:border-cyan-500/20 dark:bg-cyan-500/5",
};

function getColumnStyle(column) {
  if (column.isBase) return columnStyles[column.key] || columnStyles.backlog;
  if (column.color && CUSTOM_COLORS[column.color]) return CUSTOM_COLORS[column.color];
  return "border-violet-200/60 bg-violet-50/40 dark:border-violet-500/20 dark:bg-violet-500/5";
}

export default function KanbanColumn({
  column,
  title,
  statusKey,
  tasks,
  statuses,
  onMove,
  activeId,
  currentUser,
  onEditTask,
  onDeleteTask,
  onTaskClick,
  isAdmin,
  onRenameColumn,
  onDeleteColumn,
  isSortingColumns,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const style = column ? getColumnStyle(column) : (columnStyles[statusKey] || columnStyles.backlog);
  const isCustom = column && !column.isBase;
  const columnId = column?.id || statusKey;

  const {
    attributes: sortableAttributes,
    listeners: sortableListeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `col-${columnId}`,
    disabled: !isAdmin,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: statusKey });

  const mergedRef = useCallback(
    (node) => {
      setSortableRef(node);
      setDropRef(node);
    },
    [setSortableRef, setDropRef],
  );

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
    flex: "1 1 0",
    minWidth: 280,
  };

  function startRename() {
    setRenameValue(column?.label || title);
    setRenaming(true);
    setShowMenu(false);
  }

  function confirmRename() {
    if (renameValue.trim() && onRenameColumn && column) {
      onRenameColumn(column.id, renameValue.trim());
    }
    setRenaming(false);
  }

  return (
    <div
      ref={mergedRef}
      style={sortableStyle}
      {...sortableAttributes}
      className={`flex flex-col rounded-xl border ${style} p-3.5 min-h-[280px] transition ${
        isOver ? "ring-2 ring-indigo-400 ring-offset-2" : ""
      } ${isSortableDragging ? "shadow-lg" : ""}`}
    >
        <div className="mb-3 flex items-center justify-between gap-1">
          {isAdmin && (
            <button
              type="button"
              className="flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 active:cursor-grabbing"
              title="Arrastrar columna"
              {...sortableListeners}
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
              </svg>
            </button>
          )}

          {renaming ? (
            <form
              onSubmit={(e) => { e.preventDefault(); confirmRename(); }}
              className="flex flex-1 items-center gap-1"
            >
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                onBlur={confirmRename}
                className="flex-1 rounded border border-indigo-300 bg-white dark:bg-slate-800 px-2 py-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </form>
          ) : (
            <h3 className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
              {column?.label || title}
            </h3>
          )}

          <div className="flex items-center gap-1">
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/80 dark:bg-slate-700/80 px-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              {tasks.length}
            </span>

            {isAdmin && !renaming && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu((v) => !v)}
                  className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:text-slate-300 dark:hover:bg-slate-700/60 transition"
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                  </svg>
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1">
                    <button
                      type="button"
                      onClick={startRename}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                      </svg>
                      Renombrar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); onDeleteColumn?.(column.id); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
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
