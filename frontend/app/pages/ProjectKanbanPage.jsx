import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import KanbanColumn from "../components/KanbanColumn";
import TaskCard from "../components/TaskCard";
import ConfirmModal from "../components/ConfirmModal";
import TaskDetailPopup from "../components/TaskDetailPopup";
import ProjectNavButtons, { NewTaskButton, ProjectLoadingSpinner } from "../components/ProjectNavButtons";
import CustomSelect from "../components/CustomSelect";
import NewTaskModal from "../components/NewTaskModal";

const PRIORITIES = [
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Media" },
  { value: "LOW", label: "Baja" },
];

const BASE_STATUS_KEYS = new Set(["backlog", "in_progress", "review", "done"]);

function extractInlineImages(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  const imgs = div.querySelectorAll("img[src^='data:']");
  const files = [];
  imgs.forEach((img, i) => {
    const src = img.getAttribute("src");
    const match = src.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return;
    const mime = match[1];
    const ext = mime.split("/")[1] || "png";
    const byteStr = atob(match[2]);
    const ab = new ArrayBuffer(byteStr.length);
    const u8 = new Uint8Array(ab);
    for (let j = 0; j < byteStr.length; j++) u8[j] = byteStr.charCodeAt(j);
    const blob = new Blob([ab], { type: mime });
    const file = new File([blob], `pasted-image-${i + 1}.${ext}`, { type: mime });
    files.push(file);
    const placeholder = document.createTextNode(`{{IMG:${i}}}`);
    img.parentNode.replaceChild(placeholder, img);
  });
  let richText = div.innerHTML
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<div>/gi, "\n")
    .replace(/<\/div>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
  return { text: richText, pastedFiles: files };
}

async function descriptionToEditableHtml(description) {
  if (!description) return "";
  const ATT_RE = /\{\{ATT:([a-zA-Z0-9_-]+)\}\}/g;
  const ids = [];
  let m;
  while ((m = ATT_RE.exec(description)) !== null) ids.push(m[1]);
  if (ids.length === 0) return description.replace(/\n/g, "<br>");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const base = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "http://localhost:3000";
  const blobMap = {};
  await Promise.all(ids.map(async (attId) => {
    try {
      const res = await fetch(`${base}/attachments/${attId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      blobMap[attId] = URL.createObjectURL(blob);
    } catch { /* ignore */ }
  }));

  return description.replace(/\{\{ATT:([a-zA-Z0-9_-]+)\}\}/g, (_match, attId) => {
    const src = blobMap[attId] || "";
    return src
      ? `<img src="${src}" data-att-id="${attId}" style="max-width:100%;border-radius:8px;margin:8px 0;display:block" />`
      : `{{ATT:${attId}}}`;
  }).replace(/\n/g, "<br>");
}

function kanbanCollision(args) {
  const isDraggingColumn = String(args.active.id).startsWith("col-");

  if (isDraggingColumn) {
    return closestCenter(args);
  }

  const pw = pointerWithin(args);
  const filtered = pw.filter((c) => !String(c.id).startsWith("col-"));
  if (filtered.length > 0) return filtered;

  const ri = rectIntersection(args);
  const filteredRi = ri.filter((c) => !String(c.id).startsWith("col-"));
  if (filteredRi.length > 0) return filteredRi;

  return ri;
}

function getTaskColumnKey(task) {
  if (task.customStatus) return task.customStatus;
  return (task.status || "backlog").toLowerCase();
}

export default function ProjectKanbanPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role && String(user.role).toUpperCase() === "ADMIN";
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [dragType, setDragType] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moveError, setMoveError] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [taskEditForm, setTaskEditForm] = useState(null);
  const [editError, setEditError] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);

  const editDescRef = useRef(null);

  const handleEditDescPaste = useCallback((e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((it) => it.type.startsWith("image/"));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = document.createElement("img");
        img.src = reader.result;
        img.style.maxWidth = "100%";
        img.style.borderRadius = "8px";
        img.style.margin = "8px 0";
        img.style.display = "block";
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const br1 = document.createElement("br");
          const br2 = document.createElement("br");
          range.insertNode(br2);
          range.insertNode(img);
          range.insertNode(br1);
          range.setStartAfter(br2);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          editDescRef.current?.appendChild(img);
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const [showNewColumn, setShowNewColumn] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("");
  const [columnSaving, setColumnSaving] = useState(false);
  const [columnError, setColumnError] = useState("");
  const [deleteColumnConfirm, setDeleteColumnConfirm] = useState({ open: false, columnId: null, label: "" });
  const [deletingColumn, setDeletingColumn] = useState(false);

  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    priority: searchParams.get("priority") || "",
    assignee: searchParams.get("assignee") || "",
    dateFrom: "",
    dateTo: "",
  }));

  const statuses = useMemo(
    () => columns.map((c) => ({ key: c.key, label: c.label })),
    [columns]
  );

  const grouped = useMemo(() => {
    const map = Object.fromEntries(columns.map((c) => [c.key, []]));
    for (const t of tasks) {
      if (filters.priority && (t.priority || "").toUpperCase() !== filters.priority) continue;
      if (filters.assignee === "unassigned" && (t.assigneeId || t.assignee?.id) != null) continue;
      if (filters.assignee && filters.assignee !== "unassigned" && String(t.assigneeId ?? t.assignee?.id ?? "") !== filters.assignee) continue;
      if (filters.dateFrom || filters.dateTo) {
        const taskDate = t.createdAt ? t.createdAt.slice(0, 10) : null;
        if (!taskDate) continue;
        if (filters.dateFrom && taskDate < filters.dateFrom) continue;
        if (filters.dateTo && taskDate > filters.dateTo) continue;
      }
      const colKey = getTaskColumnKey(t);
      if (map[colKey]) {
        map[colKey].push(t);
      } else if (map.backlog) {
        map.backlog.push(t);
      }
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.order_index ?? a.orderIndex ?? 0) - (b.order_index ?? b.orderIndex ?? 0));
    }
    return map;
  }, [tasks, filters, columns]);

  const loadColumns = useCallback(async () => {
    try {
      const cols = await apiFetch(`/projects/${id}/columns`);
      setColumns(Array.isArray(cols) ? cols : []);
    } catch {
      setColumns([]);
    }
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, usersRes] = await Promise.all([
        apiFetch(`/projects/${id}/tasks`),
        apiFetch("/users").catch(() => []),
      ]);
      setTasks(Array.isArray(tasksRes) ? tasksRes : tasksRes);
      setUsers(Array.isArray(usersRes) ? usersRes : (usersRes?.users ?? []));
      await loadColumns();
    } finally {
      setLoading(false);
    }
  }, [id, loadColumns]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleTaskCreated() {
    await load();
  }

  const [lockError, setLockError] = useState("");

  async function startEditTask(task) {
    setLockError("");
    setEditError("");
    try {
      await apiFetch(`/tasks/${task.id}/lock`, { method: "POST" });
      setEditingTask(task);
      setTaskEditForm({
        title: task.title || "",
        description: task.description || "",
        assigneeId: task.assigneeId || task.assignee?.id || "",
        startDate: task.startDate || task.start_date ? (task.startDate || task.start_date).slice(0, 10) : "",
        dueDate: task.dueDate || task.due_date ? (task.dueDate || task.due_date).slice(0, 10) : "",
        priority: (task.priority || "MEDIUM").toUpperCase(),
        status: getTaskColumnKey(task),
        progress: Number(task.progress) || 0,
      });
    } catch (err) {
      setLockError(err.message || "No se pudo bloquear la tarea para edición");
    }
  }

  useEffect(() => {
    if (!editingTask || !taskEditForm) return;
    let cancelled = false;
    descriptionToEditableHtml(taskEditForm.description || "").then((html) => {
      if (!cancelled && editDescRef.current) {
        editDescRef.current.innerHTML = html;
      }
    });
    return () => { cancelled = true; };
  }, [editingTask]);

  async function cancelEditTask() {
    if (editingTask) {
      try { await apiFetch(`/tasks/${editingTask.id}/lock`, { method: "DELETE" }); } catch {}
    }
    setEditingTask(null);
    setTaskEditForm(null);
    setEditError("");
  }

  async function handleSaveTask(e) {
    e.preventDefault();
    if (!editingTask) return;
    setEditError("");
    setSaving(true);
    try {
      const selectedKey = taskEditForm.status;
      const isBase = BASE_STATUS_KEYS.has(selectedKey);

      const editHtml = editDescRef.current?.innerHTML || "";
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = editHtml;
      tempDiv.querySelectorAll("img[data-att-id]").forEach((img) => {
        const attId = img.getAttribute("data-att-id");
        if (attId) {
          const placeholder = document.createTextNode(`{{ATT:${attId}}}`);
          img.parentNode.replaceChild(placeholder, img);
        }
      });
      const cleanedHtml = tempDiv.innerHTML;
      const { text: descText, pastedFiles } = extractInlineImages(cleanedHtml);
      let finalDesc = descText || null;

      const body = {
        title: taskEditForm.title.trim(),
        description: finalDesc,
        assigneeId: taskEditForm.assigneeId || null,
        startDate: taskEditForm.startDate || null,
        dueDate: taskEditForm.dueDate || null,
        priority: taskEditForm.priority,
        status: isBase ? selectedKey.toUpperCase() : "BACKLOG",
        customStatus: isBase ? null : selectedKey,
        progress: taskEditForm.progress,
      };

      await apiFetch(`/tasks/${editingTask.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      if (pastedFiles.length > 0) {
        const fd = new FormData();
        for (const f of pastedFiles) fd.append("files", f);
        const uploadedAtts = await apiFetch(`/tasks/${editingTask.id}/attachments`, { method: "POST", body: fd });

        if (finalDesc && finalDesc.includes("{{IMG:")) {
          const atts = Array.isArray(uploadedAtts) ? uploadedAtts : [];
          pastedFiles.forEach((pf, idx) => {
            const matched = atts.find((a) => a.originalName === pf.name);
            if (matched) {
              finalDesc = finalDesc.replace(`{{IMG:${idx}}}`, `{{ATT:${matched.id}}}`);
            }
          });
          await apiFetch(`/tasks/${editingTask.id}`, {
            method: "PATCH",
            body: JSON.stringify({ description: finalDesc }),
          });
        }
      }

      try { await apiFetch(`/tasks/${editingTask.id}/lock`, { method: "DELETE" }); } catch {}
      setEditingTask(null);
      setTaskEditForm(null);
      await load();
    } catch (err) {
      setEditError(err.message || "Error al guardar la tarea");
    } finally {
      setSaving(false);
    }
  }

  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, task: null });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function handleDeleteTask(task) {
    setDeleteConfirm({ open: true, task });
    setDeleteError("");
  }

  async function confirmDeleteTask() {
    const task = deleteConfirm.task;
    if (!task) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiFetch(`/tasks/${task.id}`, { method: "DELETE" });
      await load();
      setDeleteConfirm({ open: false, task: null });
    } catch (err) {
      setDeleteError(err.message || "Error al eliminar la tarea");
    } finally {
      setDeleting(false);
    }
  }

  const moveTask = useCallback(
    async (taskId, newColumnKey) => {
      setMoveError("");
      const dest = grouped[newColumnKey] || [];
      const newOrder =
        dest.length ? (dest[dest.length - 1].order_index ?? dest[dest.length - 1].orderIndex ?? dest.length - 1) + 1 : 0;
      try {
        await apiFetch(`/tasks/${taskId}/move`, {
          method: "PATCH",
          body: JSON.stringify({ columnKey: newColumnKey, order_index: newOrder }),
        });
        await load();
      } catch (err) {
        setMoveError(err.message || "No puedes mover esta tarea.");
      }
    },
    [grouped, load]
  );

  // Column management
  async function handleCreateColumn(e) {
    e.preventDefault();
    setColumnError("");
    setColumnSaving(true);
    try {
      await apiFetch(`/projects/${id}/columns`, {
        method: "POST",
        body: JSON.stringify({ label: newColumnLabel.trim(), color: newColumnColor || undefined }),
      });
      setNewColumnLabel("");
      setNewColumnColor("");
      setShowNewColumn(false);
      await loadColumns();
    } catch (err) {
      setColumnError(err.message || "Error al crear columna");
    } finally {
      setColumnSaving(false);
    }
  }

  async function handleRenameColumn(columnId, newLabel) {
    try {
      await apiFetch(`/columns/${columnId}`, {
        method: "PATCH",
        body: JSON.stringify({ label: newLabel }),
      });
      await loadColumns();
    } catch (err) {
      setMoveError(err.message || "Error al renombrar columna");
    }
  }

  function handleDeleteColumnClick(columnId) {
    const col = columns.find((c) => c.id === columnId);
    setDeleteColumnConfirm({ open: true, columnId, label: col?.label || "" });
  }

  async function confirmDeleteColumn() {
    if (!deleteColumnConfirm.columnId) return;
    setDeletingColumn(true);
    try {
      await apiFetch(`/columns/${deleteColumnConfirm.columnId}`, { method: "DELETE" });
      setDeleteColumnConfirm({ open: false, columnId: null, label: "" });
      await load();
    } catch (err) {
      setMoveError(err.message || "Error al eliminar columna");
    } finally {
      setDeletingColumn(false);
    }
  }

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const columnSortableIds = useMemo(
    () => columns.map((c) => `col-${c.id}`),
    [columns]
  );

  function handleDragStart(ev) {
    const activeIdStr = String(ev.active.id);
    setActiveId(activeIdStr);
    setDragType(activeIdStr.startsWith("col-") ? "column" : "task");
  }

  async function handleDragEnd(ev) {
    const { active, over } = ev;
    setActiveId(null);
    setDragType(null);
    if (!over || active.id === over.id) return;

    const activeIdStr = String(active.id);

    if (activeIdStr.startsWith("col-")) {
      const oldIndex = columnSortableIds.indexOf(activeIdStr);
      let overIdForSort = String(over.id);
      if (!overIdForSort.startsWith("col-")) {
        const colForSort = columns.find((c) => c.key === overIdForSort);
        if (colForSort) overIdForSort = `col-${colForSort.id || colForSort.key}`;
      }
      const newIndex = columnSortableIds.indexOf(overIdForSort);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(columns, oldIndex, newIndex);
      setColumns(reordered);

      try {
        await apiFetch(`/projects/${id}/columns/reorder`, {
          method: "PATCH",
          body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
        });
      } catch (err) {
        setMoveError(err.message || "Error al reordenar columnas");
        await loadColumns();
      }
      return;
    }

    const taskId = activeIdStr;
    const overId = String(over.id);

    let targetKey = null;

    const colByKey = columns.find((c) => c.key === overId);
    if (colByKey) {
      targetKey = colByKey.key;
    }

    if (!targetKey && overId.startsWith("col-")) {
      const rawId = overId.slice(4);
      const colById = columns.find((c) => (c.id || c.key) === rawId);
      if (colById) targetKey = colById.key;
    }

    if (!targetKey) {
      const overTask = tasks.find((t) => String(t.id) === overId);
      if (overTask) targetKey = getTaskColumnKey(overTask);
    }

    if (targetKey) {
      moveTask(taskId, targetKey);
    }
  }

  const activeTask = activeId && dragType === "task"
    ? tasks.find((t) => String(t.id) === activeId)
    : null;

  const COLUMN_COLORS = [
    { value: "", label: "Violeta", hex: "#8b5cf6" },
    { value: "blue", label: "Azul", hex: "#3b82f6" },
    { value: "purple", label: "Púrpura", hex: "#a855f7" },
    { value: "pink", label: "Rosa", hex: "#ec4899" },
    { value: "orange", label: "Naranja", hex: "#f97316" },
    { value: "teal", label: "Verde azulado", hex: "#14b8a6" },
    { value: "cyan", label: "Cian", hex: "#06b6d4" },
  ];

  const filterElements = (vertical) => (
    <>
      <CustomSelect
        value={filters.priority}
        onChange={(val) => setFilters((f) => ({ ...f, priority: val }))}
        options={[{ value: "", label: "Todas las prioridades" }, ...PRIORITIES]}
        size="sm"
      />
      <CustomSelect
        value={filters.assignee}
        onChange={(val) => setFilters((f) => ({ ...f, assignee: val }))}
        options={[{ value: "", label: "Cualquier responsable" }, { value: "unassigned", label: "Sin asignar" }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
        size="sm"
      />
      {isAdmin && (
        <button
          type="button"
          onClick={() => { setShowNewColumn(true); setColumnError(""); }}
          className={`${vertical ? "w-full justify-center" : "ml-auto"} flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Columna
        </button>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/projects" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 transition hover:bg-slate-50 dark:hover:bg-slate-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="mr-auto">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Kanban</h2>
          </div>
          <ProjectNavButtons projectId={id} current="kanban" />
          <NewTaskButton onClick={() => setShowNewTask(true)} />
        </div>

        <div className="flex flex-wrap items-center gap-3 py-1">
          {filterElements(false)}
        </div>
      </div>

      {moveError && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
          {moveError}
        </div>
      )}

      {lockError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setLockError("")}
          onKeyDown={(e) => { if (e.key === "Escape") setLockError(""); }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div className="w-full max-w-sm rounded-xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
                <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{lockError}</p>
              <button
                type="button"
                onClick={() => setLockError("")}
                className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTask && taskEditForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={cancelEditTask} onKeyDown={(e) => { if (e.key === "Escape") cancelEditTask(); }} tabIndex={-1} ref={(el) => el?.focus()}>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Editar tarea</h3>
              <button
                type="button"
                onClick={cancelEditTask}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
            <form onSubmit={handleSaveTask} className="flex flex-col gap-4">
              {(() => { const memberIsAssignee = !isAdmin && taskEditForm.assigneeId === user?.id; const canEditField = isAdmin; const canEditProgress = isAdmin || memberIsAssignee; return (<>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Título</label>
                <input
                  type="text"
                  required
                  value={taskEditForm.title}
                  onChange={(e) => setTaskEditForm((f) => ({ ...f, title: e.target.value }))}
                  disabled={!canEditField}
                  className={`w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${!canEditField ? "opacity-60 cursor-not-allowed" : ""}`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Descripción</label>
                <div
                  ref={editDescRef}
                  contentEditable={canEditField}
                  suppressContentEditableWarning
                  onPaste={canEditField ? handleEditDescPaste : undefined}
                  data-placeholder="Descripción de la tarea (opcional)"
                  className={`w-full min-h-[80px] max-h-[200px] overflow-y-auto rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:dark:text-slate-500 empty:before:pointer-events-none ${!canEditField ? "opacity-60 cursor-not-allowed" : ""}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Asignar a</label>
                  <CustomSelect
                    value={taskEditForm.assigneeId}
                    onChange={(val) => setTaskEditForm((f) => ({ ...f, assigneeId: val }))}
                    options={[{ value: "", label: "Sin asignar" }, ...(isAdmin ? users : users.filter((u) => u.id === user?.id)).map((u) => ({ value: u.id, label: u.name }))]}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Fecha inicio</label>
                  <input
                    type="date"
                    value={taskEditForm.startDate}
                    onChange={(e) => setTaskEditForm((f) => ({ ...f, startDate: e.target.value }))}
                    disabled={!canEditField}
                    className={`w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${!canEditField ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Fecha fin</label>
                  <input
                    type="date"
                    min={taskEditForm.startDate || undefined}
                    value={taskEditForm.dueDate}
                    onChange={(e) => setTaskEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                    disabled={!canEditField}
                    className={`w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${!canEditField ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Prioridad</label>
                  <CustomSelect
                    value={taskEditForm.priority}
                    onChange={(val) => setTaskEditForm((f) => ({ ...f, priority: val }))}
                    options={PRIORITIES}
                    disabled={!canEditField}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Estado</label>
                  <CustomSelect
                    value={taskEditForm.status}
                    onChange={(val) => setTaskEditForm((f) => ({ ...f, status: val }))}
                    options={columns.map((col) => ({ value: col.key, label: col.label }))}
                    disabled={!canEditProgress}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Progreso</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={taskEditForm.progress}
                    onChange={(e) => setTaskEditForm((f) => ({ ...f, progress: Number(e.target.value) }))}
                    disabled={!canEditProgress}
                    className={`flex-1 accent-indigo-600 ${!canEditProgress ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                  <span className="w-10 text-right text-sm font-medium text-slate-700 dark:text-slate-200">{taskEditForm.progress}%</span>
                </div>
              </div>
              </>); })()}
              {editError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{editError}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={cancelEditTask} className="px-6 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-indigo-400 text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer not-disabled:hover:-translate-y-0.5 not-disabled:hover:shadow-[0_4px_12px_rgba(95,150,249,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-indigo-300">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <NewTaskModal
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        projectId={id}
        users={users}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        onCreated={handleTaskCreated}
      />

      {/* New Column Modal */}
      {showNewColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowNewColumn(false)}>
          <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Nueva columna</h3>
              <button type="button" onClick={() => setShowNewColumn(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateColumn} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Nombre *</label>
                <input
                  type="text"
                  required
                  value={newColumnLabel}
                  onChange={(e) => setNewColumnLabel(e.target.value)}
                  placeholder="Ej: QA, Diseño, Pendiente cliente..."
                  autoFocus
                  className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Color</label>
                <div className="flex flex-wrap gap-2.5 mt-1">
                  {COLUMN_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewColumnColor(c.value)}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${newColumnColor === c.value ? "border-slate-800 dark:border-white scale-110 shadow-md" : "border-transparent hover:scale-105"}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              {columnError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{columnError}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNewColumn(false)} className="px-6 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
                  Cancelar
                </button>
                <button type="submit" disabled={columnSaving} className="px-6 py-2 bg-indigo-400 text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer not-disabled:hover:-translate-y-0.5 not-disabled:hover:shadow-[0_4px_12px_rgba(95,150,249,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-indigo-300">
                  {columnSaving ? "Creando..." : "Crear columna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <ProjectLoadingSpinner />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollision}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={columnSortableIds} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-5 w-full overflow-x-auto pb-2">
              {columns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  title={col.label}
                  statusKey={col.key}
                  tasks={grouped[col.key] || []}
                  statuses={statuses}
                  onMove={moveTask}
                  activeId={activeId}
                  currentUser={user}
                  onEditTask={startEditTask}
                  onDeleteTask={handleDeleteTask}
                  onTaskClick={setSelectedTask}
                  isAdmin={isAdmin}
                  onRenameColumn={handleRenameColumn}
                  onDeleteColumn={handleDeleteColumnClick}
                  isSortingColumns={dragType === "column"}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeTask ? (
              <div className="rotate-2 scale-105 opacity-90">
                <TaskCard
                  task={activeTask}
                  statuses={statuses}
                  onMove={() => {}}
                  isDragging={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <ConfirmModal
        open={deleteConfirm.open}
        title="Eliminar tarea"
        message={
          deleteConfirm.task
            ? `¿Eliminar la tarea "${deleteConfirm.task.title}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDeleteTask}
        onCancel={() => { setDeleteConfirm({ open: false, task: null }); setDeleteError(""); }}
      />

      <ConfirmModal
        open={deleteColumnConfirm.open}
        title="Eliminar columna"
        message={
          deleteColumnConfirm.label
            ? `¿Eliminar la columna "${deleteColumnConfirm.label}"? Las tareas en esta columna serán movidas a la primera columna disponible.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deletingColumn}
        onConfirm={confirmDeleteColumn}
        onCancel={() => setDeleteColumnConfirm({ open: false, columnId: null, label: "" })}
      />

      {deleteError && !deleteConfirm.open && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-red-200 dark:border-red-500/30 bg-white dark:bg-slate-900 px-4 py-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-600 dark:text-red-400">{deleteError}</span>
            <button type="button" onClick={() => setDeleteError("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
      {selectedTask && (
        <TaskDetailPopup
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
