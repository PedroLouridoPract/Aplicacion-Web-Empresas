import React, { useState, useRef, useEffect, useMemo } from "react";
import CustomSelect from "./CustomSelect";

const PRIORITIES = [
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Media" },
  { value: "LOW", label: "Baja" },
];

const TASK_TYPES = [
  { value: "tarea", label: "Tarea" },
];

const ASSIGN_MODES = [
  { key: "one", label: "Un empleado" },
  { key: "many", label: "Varios empleados" },
  { key: "all", label: "Toda la empresa" },
];

function pad2(n) { return String(n).padStart(2, "0"); }
function nowHHmm() { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function todayISO() { return new Date().toISOString().slice(0, 10); }

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

export default function NewTaskModal({ open, onClose, projectId, users, isAdmin, currentUserId, onCreated }) {
  const [taskType, setTaskType] = useState("tarea");
  const [priority, setPriority] = useState("MEDIUM");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startTime, setStartTime] = useState(() => nowHHmm());
  const [endTime, setEndTime] = useState("");
  const [assignMode, setAssignMode] = useState("one");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [contact, setContact] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const descRef = useRef(null);
  const fileInputRef = useRef(null);
  const today = todayISO();

  useEffect(() => {
    if (open) {
      setTaskType("tarea");
      setPriority("MEDIUM");
      setTitle("");
      setStartDate("");
      setDueDate("");
      setStartTime(nowHHmm());
      setEndTime("");
      setAssignMode("one");
      setSelectedUser("");
      setSelectedUsers([]);
      setUserSearch("");
      setContact("");
      setFiles([]);
      setError("");
      setSaving(false);
      setTimeout(() => {
        if (descRef.current) descRef.current.innerHTML = "";
      }, 0);
    }
  }, [open]);

  const availableUsers = useMemo(() => {
    if (!isAdmin) return users.filter((u) => u.id === currentUserId);
    return users;
  }, [users, isAdmin, currentUserId]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return availableUsers;
    const q = userSearch.toLowerCase();
    return availableUsers.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [availableUsers, userSearch]);

  function handleDescPaste(e) {
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
          descRef.current?.appendChild(img);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function toggleUserSelection(userId) {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function getAssigneeIds() {
    if (assignMode === "one") return selectedUser ? [selectedUser] : [];
    if (assignMode === "many") return selectedUsers;
    if (assignMode === "all") return availableUsers.map((u) => u.id);
    return [];
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setError("");
    setSaving(true);

    try {
      const descHtml = descRef.current?.innerHTML || "";
      const { text: descText, pastedFiles } = extractInlineImages(descHtml);
      const allFiles = [...files, ...pastedFiles];
      const assigneeIds = getAssigneeIds();

      const createOne = async (assigneeId) => {
        const { apiFetch: api } = await import("../api/http");
        const task = await api("/tasks", {
          method: "POST",
          body: JSON.stringify({
            projectId,
            title: title.trim(),
            description: descText || null,
            assigneeId: assigneeId || null,
            startDate: startDate || null,
            dueDate: dueDate || null,
            priority,
          }),
        });

        if (allFiles.length > 0) {
          const fd = new FormData();
          for (const f of allFiles) fd.append("files", f);
          const uploadedAtts = await api(`/tasks/${task.id}/attachments`, { method: "POST", body: fd });

          if (pastedFiles.length > 0 && descText && descText.includes("{{IMG:")) {
            let finalDesc = descText;
            const atts = Array.isArray(uploadedAtts) ? uploadedAtts : [];
            pastedFiles.forEach((pf, idx) => {
              const match = atts.find((a) => a.originalName === pf.name);
              if (match) {
                finalDesc = finalDesc.replace(`{{IMG:${idx}}}`, `{{ATT:${match.id}}}`);
              }
            });
            if (finalDesc !== descText) {
              await api(`/tasks/${task.id}`, {
                method: "PATCH",
                body: JSON.stringify({ description: finalDesc }),
              });
            }
          }
        }

        return task;
      };

      if (assigneeIds.length <= 1) {
        await createOne(assigneeIds[0] || null);
      } else {
        await Promise.all(assigneeIds.map((uid) => createOne(uid)));
      }

      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.message || "Error al crear la tarea");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-2xl animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Nueva tarea</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-2xl cursor-pointer transition">×</button>
        </div>

        <form id="new-task-form" onSubmit={handleSubmit} className="px-8 py-5 flex flex-col gap-5">
          {/* Tipo + Prioridad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-slate-200">Tipo</label>
              <CustomSelect value={taskType} onChange={setTaskType} options={TASK_TYPES} className="w-full" variant="modal" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-slate-200">Priority</label>
              <CustomSelect value={priority} onChange={setPriority} options={PRIORITIES} className="w-full" variant="modal" />
            </div>
          </div>

          {/* Titulo */}
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-slate-200">Título</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título"
              className="w-full rounded-xl border-2 border-[#f2f2f2] bg-[#f2f2f2] dark:bg-slate-800 dark:border-slate-700 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5F96F9] focus:border-[#5F96F9] transition-all"
            />
          </div>

          {/* Fechas + Horas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-slate-200">Fecha inicio</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#f2f2f2] bg-[#f2f2f2] dark:bg-slate-800 dark:border-slate-700 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5F96F9] focus:border-[#5F96F9] transition-all cursor-pointer"
                />
                {startDate && (
                  <button
                    type="button"
                    onClick={() => setStartDate("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-slate-200">Fecha fin</label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={startDate || today}
                  className="w-full rounded-xl border-2 border-[#f2f2f2] bg-[#f2f2f2] dark:bg-slate-800 dark:border-slate-700 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5F96F9] focus:border-[#5F96F9] transition-all cursor-pointer"
                />
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-slate-200">Hora inicio</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border-2 border-[#f2f2f2] bg-[#f2f2f2] dark:bg-slate-800 dark:border-slate-700 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5F96F9] focus:border-[#5F96F9] transition-all"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-slate-200">Hora fin</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="--:--"
                className="w-full rounded-xl border-2 border-[#f2f2f2] bg-[#f2f2f2] dark:bg-slate-800 dark:border-slate-700 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5F96F9] focus:border-[#5F96F9] transition-all"
              />
            </div>
          </div>

          {/* Asignar a */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">Asignar a</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {ASSIGN_MODES.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setAssignMode(mode.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm border transition ${
                    assignMode === mode.key
                      ? "border-[#5F96F9] bg-[#5F96F9]/10 text-[#5F96F9]"
                      : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {assignMode === "one" && (
              <div>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full rounded-lg bg-[#f5f5f5] dark:bg-slate-800 px-3 py-2 text-sm text-gray-700 dark:text-slate-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5F96F9] focus:bg-white transition-colors mb-2"
                />
                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedUser("")}
                    className={`w-full text-left px-4 py-2 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
                      !selectedUser ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Sin asignar
                  </button>
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUser(u.id)}
                      className={`w-full text-left px-4 py-2 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
                        selectedUser === u.id ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium" : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {u.name}{u.email ? ` (${u.email})` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {assignMode === "many" && (
              <div>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full rounded-lg bg-[#f5f5f5] dark:bg-slate-800 px-3 py-2 text-sm text-gray-700 dark:text-slate-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5F96F9] focus:bg-white transition-colors mb-2"
                />
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedUsers.map((uid) => {
                      const u = availableUsers.find((x) => x.id === uid);
                      return u ? (
                        <span key={uid} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                          {u.name}
                          <button type="button" onClick={() => toggleUserSelection(uid)} className="ml-0.5 text-indigo-400 hover:text-indigo-600">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  {filteredUsers.map((u) => (
                    <label key={u.id} className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u.id)}
                        onChange={() => toggleUserSelection(u.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-700 dark:text-slate-200">{u.name}{u.email ? ` (${u.email})` : ""}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {assignMode === "all" && (
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-4 py-3">
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                  Se creará una tarea para cada empleado de la empresa ({availableUsers.length} empleados)
                </p>
              </div>
            )}
          </div>

          {/* Vincular a contacto */}
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-slate-200">Vincular a contacto</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Buscar cliente o proveedor..."
              disabled
              className="w-full rounded-xl border-2 border-[#f2f2f2] bg-[#f2f2f2] dark:bg-slate-800 dark:border-slate-700 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-500 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#5F96F9] focus:border-[#5F96F9] transition-all pr-10 cursor-not-allowed opacity-60"
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Disponible próximamente</p>
          </div>

          {/* Descripcion con soporte de imagenes */}
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-slate-200">Descripcion</label>
            <div
              ref={descRef}
              contentEditable
              suppressContentEditableWarning
              onPaste={handleDescPaste}
              data-placeholder="Descripción de la tarea (opcional)"
              className="w-full min-h-[100px] max-h-[200px] overflow-y-auto rounded-xl border-2 border-[#f2f2f2] bg-[#f2f2f2] dark:bg-slate-800 dark:border-slate-700 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5F96F9] focus:border-[#5F96F9] transition-all whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:dark:text-slate-500 empty:before:pointer-events-none resize-none"
            />
          </div>

          {/* Documentos vinculados (archivos adjuntos) */}
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-slate-200">Documentos vinculados (opcional)</label>
            <div
              className="relative rounded-xl border-2 border-[#f2f2f2] bg-[#f2f2f2] dark:bg-slate-800/50 dark:border-slate-600 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-400 cursor-pointer hover:border-[#5F96F9] transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12a2 2 0 002-2V8l-6-6H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Buscar y añadir facturas o presupuestos...</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
              />
            </div>
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200">
                    {f.type?.startsWith("image/") ? (
                      <svg className="h-3.5 w-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    ) : (
                      <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    )}
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="ml-0.5 text-slate-400 hover:text-red-500"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Máx. 10 MB por archivo. Imágenes, PDF, Office, CSV, ZIP.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
          )}
        </form>

        <div className="px-8 py-5 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-white dark:bg-slate-800 border border-[#5F96F9] text-[#5F96F9] rounded-xl cursor-pointer transition-all not-disabled:hover:-translate-y-0.5 not-disabled:hover:shadow-[0_4px_12px_rgba(95,150,249,0.3)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="new-task-form"
            disabled={saving || !title.trim()}
            className="px-6 py-2 bg-[#5F96F9] text-white rounded-xl shadow-sm transition-all cursor-pointer not-disabled:hover:-translate-y-0.5 not-disabled:hover:shadow-[0_4px_12px_rgba(95,150,249,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Creando..." : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}
