import React, { useEffect, useState, useRef, useCallback } from "react";
import { apiFetch } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import Avatar from "./Avatar";

function parseTaskTitle(title) {
  if (!title) return { key: "", id: "", type: "" };
  const parts = title.split("·").map((s) => s.trim());
  if (parts.length >= 3) return { key: parts[0], id: parts[1], type: parts[2] };
  if (parts.length === 2) return { key: parts[0], id: parts[1], type: "" };
  return { key: title, id: "", type: "" };
}

const priorityLabel = { HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" };
const statusLabel = { BACKLOG: "Backlog", IN_PROGRESS: "En proceso", REVIEW: "En revisión", DONE: "Finalizado" };

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;
const QUICK_EMOJIS = ["👍", "👎", "😊"];

function renderCommentBody(body) {
  const parts = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(MENTION_REGEX.source, "g");
  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) parts.push(body.slice(lastIndex, match.index));
    parts.push(
      <span key={match.index} className="rounded bg-indigo-100 dark:bg-indigo-500/20 px-1 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
        @{match[1]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < body.length) parts.push(body.slice(lastIndex));
  return parts;
}

function extractMentionIds(text) {
  const ids = [];
  let m;
  const regex = new RegExp(MENTION_REGEX.source, "g");
  while ((m = regex.exec(text)) !== null) ids.push(m[2]);
  return ids;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseReactions(reactionsStr) {
  if (!reactionsStr) return {};
  try { return JSON.parse(reactionsStr); } catch { return {}; }
}

function CommentItem({ comment, isReply, userId, isAdmin, canComment, onDelete, onReply, onReact, users }) {
  const authorDisplay = comment.author?.name || comment.authorName || "Usuario";
  const canDelete = isAdmin || (comment.authorId && comment.authorId === userId);
  let attachments = [];
  if (comment.attachments) {
    try { attachments = JSON.parse(comment.attachments); } catch {}
  }
  const reactions = parseReactions(comment.reactions);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div className={isReply ? "ml-8 mt-2" : ""}>
      <div className="rounded-lg border border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Avatar name={authorDisplay} src={comment.author?.avatarUrl} size="xs" />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{authorDisplay}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {new Date(comment.createdAt).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          {canDelete && (
            <button type="button" onClick={() => onDelete(comment.id)} className="text-xs text-red-500 hover:text-red-700 dark:text-red-400" title="Borrar">
              Borrar
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{renderCommentBody(comment.body)}</p>

        {attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((att, idx) => {
              const isImage = att.type?.startsWith("image/");
              return isImage ? (
                <a key={idx} href={att.data} download={att.name} className="block">
                  <img src={att.data} alt={att.name} className="h-16 w-16 rounded-md object-cover border border-slate-200 dark:border-slate-700" />
                </a>
              ) : (
                <a key={idx} href={att.data} download={att.name} className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {att.name}
                </a>
              );
            })}
          </div>
        )}

        {/* Reactions display */}
        {Object.keys(reactions).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {Object.entries(reactions).map(([emoji, userIds]) => {
              const hasReacted = userIds.includes(userId);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(comment.id, emoji)}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition ${
                    hasReacted
                      ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        {canComment && (
          <div className="mt-1.5 flex items-center gap-1">
            {!isReply && (
              <button
                type="button"
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition"
                title="Responder"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Responder
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                className="flex items-center rounded px-1.5 py-0.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition"
                title="Reaccionar"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>
              {showEmojiPicker && (
                <div className="absolute left-0 bottom-full mb-1 flex gap-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1 z-20">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { onReact(comment.id, emoji); setShowEmojiPicker(false); }}
                      className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-base transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="space-y-2 mt-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isReply
              userId={userId}
              isAdmin={isAdmin}
              canComment={canComment}
              onDelete={onDelete}
              onReply={onReply}
              onReact={onReact}
              users={users}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getTextFromEditable(el) {
  let text = "";
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent.replace(/\u00A0/g, " ");
    } else if (node.dataset?.mentionId) {
      text += `@[${node.dataset.mentionName}](${node.dataset.mentionId})`;
    } else {
      text += node.textContent.replace(/\u00A0/g, " ");
    }
  }
  return text;
}

function placeCaretAtEnd(el) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function getCaretTextBefore(el) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return "";
  const range = sel.getRangeAt(0);
  const caretNode = range.startContainer;
  const caretOffset = range.startOffset;

  if (caretNode === el) {
    let text = "";
    const children = Array.from(el.childNodes);
    for (let i = 0; i < caretOffset && i < children.length; i++) {
      const node = children[i];
      if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
      else if (node.dataset?.mentionId) text += "\uFFFC";
      else text += node.textContent;
    }
    return text;
  }

  let text = "";
  for (const node of el.childNodes) {
    if (node === caretNode || node.contains(caretNode)) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent.slice(0, caretOffset);
      }
      break;
    }
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
    else if (node.dataset?.mentionId) text += "\uFFFC";
    else text += node.textContent;
  }
  return text;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export default function TaskDetailPopup({ task, onClose, onCommentAdded }) {
  const { user } = useAuth();
  const role = (user?.role && String(user.role).toUpperCase()) || "";
  const isAdmin = role === "ADMIN";
  const canComment = role === "ADMIN" || role === "MEMBER";

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [users, setUsers] = useState([]);
  const [sending, setSending] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null);
  const [inputEmpty, setInputEmpty] = useState(true);
  const [taskAttachments, setTaskAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const commentsEndRef = useRef(null);

  const loadComments = useCallback(async () => {
    if (!task?.id) return;
    setLoadingComments(true);
    try {
      const res = await apiFetch(`/comments/by-task/${task.id}`);
      setComments(res.comments ?? (Array.isArray(res) ? res : []));
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [task?.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  useEffect(() => {
    if (!task?.id) return;
    setLoadingAttachments(true);
    apiFetch(`/tasks/${task.id}/attachments`)
      .then((data) => setTaskAttachments(Array.isArray(data) ? data : []))
      .catch(() => setTaskAttachments([]))
      .finally(() => setLoadingAttachments(false));
  }, [task?.id]);

  useEffect(() => {
    apiFetch("/users").then((data) => {
      setUsers(Array.isArray(data) ? data : data.users ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function onEsc(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  useEffect(() => {
    if (commentsEndRef.current && !loadingComments) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments.length, loadingComments]);

  const checkMentionTrigger = () => {
    if (!inputRef.current) return;
    const textBefore = getCaretTextBefore(inputRef.current);
    const atMatch = textBefore.match(/@([\w\s\u00C0-\u024F]*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionFilter(atMatch[1].trim().toLowerCase());
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const handleInput = () => {
    if (!inputRef.current) return;
    const raw = getTextFromEditable(inputRef.current);
    setInputEmpty(!raw.trim());
    checkMentionTrigger();
  };

  const filteredMentionUsers = users.filter(
    (u) => u.id !== user?.id && u.name.toLowerCase().includes(mentionFilter)
  );

  const insertMention = (mentionUser) => {
    const el = inputRef.current;
    if (!el) return;

    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    const textBefore = getCaretTextBefore(el);
    const atPos = textBefore.lastIndexOf("@");
    if (atPos === -1) return;

    const charsToDelete = textBefore.length - atPos;
    for (let i = 0; i < charsToDelete; i++) {
      document.execCommand("delete", false);
    }

    const chip = document.createElement("span");
    chip.contentEditable = "false";
    chip.dataset.mentionId = mentionUser.id;
    chip.dataset.mentionName = mentionUser.name;
    chip.className = "inline-flex items-center rounded bg-indigo-100 dark:bg-indigo-500/20 px-1.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mx-0.5 select-none";
    chip.textContent = `@${mentionUser.name}`;

    const newRange = sel.getRangeAt(0);
    newRange.insertNode(chip);
    newRange.setStartAfter(chip);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    const space = document.createTextNode("\u00A0");
    newRange.insertNode(space);
    newRange.setStartAfter(space);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    setShowMentions(false);
    setInputEmpty(false);
  };

  const handleKeyDown = (e) => {
    if (showMentions && filteredMentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, filteredMentionUsers.length - 1));
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
        return;
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMentionUsers[mentionIndex]);
        return;
      } else if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSubmit({ preventDefault: () => {} });
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = [];
    for (const f of files) {
      const data = await fileToBase64(f);
      newAttachments.push({ name: f.name, type: f.type, size: f.size, data });
    }
    setAttachedFiles((prev) => [...prev, ...newAttachments]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (idx) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const el = inputRef.current;
    const rawText = el ? getTextFromEditable(el).trim() : "";
    if (!rawText && attachedFiles.length === 0) return;
    setSending(true);
    try {
      const mentionedUserIds = extractMentionIds(rawText);
      const attachments = attachedFiles.length > 0 ? JSON.stringify(attachedFiles) : undefined;
      await apiFetch("/comments", {
        method: "POST",
        body: JSON.stringify({
          taskId: task.id,
          body: rawText,
          attachments,
          mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
          parentId: replyingTo || undefined,
        }),
      });
      if (el) el.innerHTML = "";
      setInputEmpty(true);
      setAttachedFiles([]);
      setReplyingTo(null);
      await loadComments();
      if (onCommentAdded) onCommentAdded();
    } catch (err) {
      alert(err.message || "Error al enviar comentario");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("¿Borrar este comentario?")) return;
    try {
      await apiFetch(`/comments/${commentId}`, { method: "DELETE" });
      await loadComments();
    } catch (err) {
      alert(err.message || "Error al borrar comentario");
    }
  };

  const handleReply = (commentId) => {
    setReplyingTo(commentId);
    setTimeout(() => {
      if (inputRef.current) placeCaretAtEnd(inputRef.current);
    }, 0);
  };

  const handleReact = async (commentId, emoji) => {
    try {
      const res = await apiFetch(`/comments/${commentId}/reaction`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) return { ...c, reactions: JSON.stringify(res.reactions) };
          if (c.replies?.length) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId ? { ...r, reactions: JSON.stringify(res.reactions) } : r
              ),
            };
          }
          return c;
        })
      );
    } catch (err) {
      alert(err.message || "Error al reaccionar");
    }
  };

  if (!task) return null;

  const parsed = parseTaskTitle(task.title);
  const creator = task.creatorName || null;
  const reporter = task.reporterName || null;
  const sameCreatorReporter = creator && reporter && creator.toLowerCase() === reporter.toLowerCase();
  const isDone = (task.status || "").toUpperCase() === "DONE";
  const progress = isDone ? 100 : (Number(task.progress) || 0);

  const replyingComment = replyingTo ? comments.find((c) => c.id === replyingTo) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      tabIndex={-1}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">{task.title}</h2>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {parsed.key && <span className="font-mono">{parsed.key}</span>}
              {parsed.id && <><span>·</span><span className="font-mono">{parsed.id}</span></>}
              {parsed.type && <><span>·</span><span>{parsed.type}</span></>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Summary */}
          {task.summary && (
            <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 p-4">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">Resumen</span>
              <p className="mt-1 text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{task.summary}</p>
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Persona asignada</span>
              <div className="mt-0.5 flex items-center gap-2">
                {task.assignee ? (
                  <>
                    <Avatar name={task.assignee.name} src={task.assignee.avatarUrl} size="2xs" />
                    <span className="text-slate-800 dark:text-slate-100">{task.assignee.name}</span>
                  </>
                ) : (
                  <span className="text-slate-800 dark:text-slate-100">Sin asignar</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Prioridad</span>
              <p className="mt-0.5 text-slate-800 dark:text-slate-100">{priorityLabel[(task.priority || "MEDIUM").toUpperCase()] || task.priority}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Estado</span>
              <p className="mt-0.5 text-slate-800 dark:text-slate-100">{statusLabel[(task.status || "BACKLOG").toUpperCase()] || task.status}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Fecha creación</span>
              <p className="mt-0.5 text-slate-800 dark:text-slate-100">
                {task.createdAt ? new Date(task.createdAt).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
              </p>
            </div>
            {(task.dueDate || task.due_date) && (
              <div>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Fecha límite</span>
                <p className="mt-0.5 text-slate-800 dark:text-slate-100">
                  {new Date(task.dueDate || task.due_date).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
            {task.resolvedAt && (
              <div>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Fecha resuelta</span>
                <p className="mt-0.5 text-slate-800 dark:text-slate-100">
                  {new Date(task.resolvedAt).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Progreso</span>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{progress}%</span>
              </div>
            </div>
            {sameCreatorReporter ? (
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Creador / Informador</span>
                <p className="mt-0.5 text-slate-800 dark:text-slate-100">{creator}</p>
              </div>
            ) : (
              <>
                {creator && (
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Creador</span>
                    <p className="mt-0.5 text-slate-800 dark:text-slate-100">{creator}</p>
                  </div>
                )}
                {reporter && (
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Informador</span>
                    <p className="mt-0.5 text-slate-800 dark:text-slate-100">{reporter}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Descripción</span>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{task.description}</p>
            </div>
          )}

          {/* Task Attachments */}
          {!loadingAttachments && taskAttachments.length > 0 && (
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Archivos adjuntos ({taskAttachments.length})
              </span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {taskAttachments.map((att) => {
                  const isImage = att.mimeType?.startsWith("image/");
                  const downloadUrl = `${API_BASE}/attachments/${att.id}/download`;
                  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
                  const authUrl = token ? `${downloadUrl}?token=${encodeURIComponent(token)}` : downloadUrl;
                  const sizeLabel = att.size < 1024
                    ? `${att.size} B`
                    : att.size < 1024 * 1024
                      ? `${(att.size / 1024).toFixed(1)} KB`
                      : `${(att.size / (1024 * 1024)).toFixed(1)} MB`;

                  return (
                    <a
                      key={att.id}
                      href={authUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-3 py-2.5 transition hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 group"
                    >
                      {isImage ? (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-500/10">
                          <svg className="h-5 w-5 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                          </svg>
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700">
                          <svg className="h-5 w-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {att.originalName}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {sizeLabel}
                          {att.uploadedBy?.name && <> · {att.uploadedBy.name}</>}
                        </p>
                      </div>
                      <svg className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
          {loadingAttachments && (
            <p className="text-xs text-slate-400 dark:text-slate-500">Cargando adjuntos...</p>
          )}

          {/* Comments */}
          <div className="border-t border-slate-100 dark:border-slate-700/50 pt-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Comentarios</h4>

            {loadingComments ? (
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Cargando comentarios...</p>
            ) : comments.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Sin comentarios aún.</p>
            ) : (
              <div className="mt-3 space-y-3 max-h-72 overflow-y-auto">
                {comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    isReply={false}
                    userId={user?.id}
                    isAdmin={isAdmin}
                    canComment={canComment}
                    onDelete={handleDeleteComment}
                    onReply={handleReply}
                    onReact={handleReact}
                    users={users}
                  />
                ))}
                <div ref={commentsEndRef} />
              </div>
            )}

            {/* Comment form */}
            {canComment && (
              <form onSubmit={handleSubmit} className="mt-3 space-y-2">
                {replyingTo && (
                  <div className="flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-700 dark:text-indigo-300">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    <span>Respondiendo a <strong>{replyingComment?.author?.name || "comentario"}</strong></span>
                    <button type="button" onClick={() => setReplyingTo(null)} className="ml-auto text-indigo-500 hover:text-indigo-700">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="relative">
                  <div
                    ref={inputRef}
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    data-placeholder={replyingTo ? "Escribe tu respuesta..." : "Escribe un comentario... usa @ para mencionar"}
                    className="mention-input w-full min-h-[38px] max-h-32 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 whitespace-pre-wrap break-words"
                  />
                  {showMentions && filteredMentionUsers.length > 0 && (
                    <ul className="absolute bottom-full left-0 mb-1 w-64 max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-20">
                      {filteredMentionUsers.map((u, idx) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => insertMention(u)}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                              idx === mentionIndex
                                ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                                : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            <Avatar name={u.name} src={u.avatarUrl} size="2xs" />
                            <span>{u.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs text-slate-600 dark:text-slate-300">
                        {f.type?.startsWith("image/") ? (
                          <img src={f.data} alt={f.name} className="h-6 w-6 rounded object-cover" />
                        ) : (
                          <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        <span className="max-w-[100px] truncate">{f.name}</span>
                        <button type="button" onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                    title="Adjuntar archivo"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Adjuntar
                  </button>
                  <div className="flex-1" />
                  <button
                    type="submit"
                    disabled={sending || (inputEmpty && attachedFiles.length === 0)}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                  >
                    {sending ? "..." : replyingTo ? "Responder" : "Enviar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
