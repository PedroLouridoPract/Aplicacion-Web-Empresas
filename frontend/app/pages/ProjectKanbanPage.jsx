import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { apiFetch } from "../api/http";
import KanbanColumn from "../components/KanbanColumn";
import TaskCard from "../components/TaskCard";

const STATUSES = [
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "En proceso" },
  { key: "review", label: "En revisión" },
  { key: "done", label: "Finalizado" },
];

export default function ProjectKanbanPage() {
  const { id } = useParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(STATUSES.map((s) => [s.key, []]));
    for (const t of tasks) map[t.status]?.push(t);
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    }
    return map;
  }, [tasks]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/projects/${id}/tasks`);
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const moveTask = useCallback(
    async (taskId, newStatus) => {
      const dest = grouped[newStatus] || [];
      const newOrder =
        dest.length ? (dest[dest.length - 1].order_index ?? dest.length - 1) + 1 : 0;

      await apiFetch(`/tasks/${taskId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus, order_index: newOrder }),
      });
      await load();
    },
    [grouped, load]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handleDragStart(ev) {
    setActiveId(ev.active.id);
  }

  function handleDragEnd(ev) {
    const { active, over } = ev;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const taskId = active.id;
    const newStatus = String(over.id);
    if (STATUSES.some((s) => s.key === newStatus)) {
      moveTask(taskId, newStatus);
    }
  }

  const activeTask = activeId ? tasks.find((t) => String(t.id) === activeId) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kanban</h1>
          <p className="mt-1 text-sm text-slate-500">Proyecto {id}</p>
        </div>
        <Link
          to={`/projects/${id}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          ← Proyecto
        </Link>
      </div>
      <p className="text-sm text-slate-500">
        Arrastra las tarjetas entre columnas o usa los botones para mover.
      </p>

      {loading ? (
        <div className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm border border-slate-200/80">
          Cargando...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {STATUSES.map((s) => (
              <KanbanColumn
                key={s.key}
                title={s.label}
                statusKey={s.key}
                tasks={grouped[s.key] || []}
                statuses={STATUSES}
                onMove={moveTask}
                activeId={activeId}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="rotate-2 scale-105 opacity-90">
                <TaskCard
                  task={activeTask}
                  statuses={STATUSES}
                  onMove={() => {}}
                  isDragging={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
