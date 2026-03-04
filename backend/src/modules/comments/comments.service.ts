import { prisma } from "../../db/prisma";
import { createNotification } from "../notifications/notifications.service";

async function assertTaskInCompany(params: { taskId: string; companyId: string }) {
  const task = await prisma.task.findFirst({
    where: { id: params.taskId, companyId: params.companyId },
    select: { id: true, projectId: true, title: true },
  });

  if (!task) throw Object.assign(new Error("La tarea no existe o no pertenece a tu empresa"), { statusCode: 404 });
  return task;
}

const authorSelect = { id: true, name: true, email: true, avatarUrl: true };

export async function listByTask(params: { companyId: string; taskId: string }) {
  await assertTaskInCompany({ taskId: params.taskId, companyId: params.companyId });

  return prisma.comment.findMany({
    where: { companyId: params.companyId, taskId: params.taskId, parentId: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: authorSelect },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: authorSelect } },
      },
    },
  });
}

export async function create(params: {
  companyId: string;
  userId: string;
  taskId: string;
  body: string;
  attachments?: string;
  mentionedUserIds?: string[];
  parentId?: string;
}) {
  const task = await assertTaskInCompany({ taskId: params.taskId, companyId: params.companyId });

  const comment = await prisma.comment.create({
    data: {
      companyId: params.companyId,
      taskId: params.taskId,
      authorId: params.userId,
      body: params.body,
      attachments: params.attachments ?? null,
      parentId: params.parentId ?? null,
    },
    include: {
      author: { select: authorSelect },
    },
  });

  const authorName = comment.author?.name ?? "Alguien";
  const notifiedIds = new Set<string>();

  if (params.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: params.parentId },
      select: { authorId: true },
    });
    if (parent?.authorId && parent.authorId !== params.userId) {
      notifiedIds.add(parent.authorId);
      await createNotification({
        userId: parent.authorId,
        message: `${authorName} respondió a tu comentario en "${task.title}"`,
        taskId: params.taskId,
        category: "task_comments",
      });
    }
  }

  if (params.mentionedUserIds?.length) {
    const uniqueIds = [...new Set(params.mentionedUserIds)].filter(id => id !== params.userId && !notifiedIds.has(id));

    const validUsers = await prisma.user.findMany({
      where: { id: { in: uniqueIds }, companyId: params.companyId },
      select: { id: true },
    });

    await Promise.all(
      validUsers.map(u =>
        createNotification({
          userId: u.id,
          message: `${authorName} te mencionó en un comentario en "${task.title}"`,
          taskId: params.taskId,
          category: "task_comments",
        })
      )
    );
  }

  return comment;
}

export async function edit(params: {
  companyId: string;
  userId: string;
  commentId: string;
  body: string;
  mentionedUserIds?: string[];
}) {
  const comment = await prisma.comment.findFirst({
    where: { id: params.commentId, companyId: params.companyId },
    include: { author: { select: authorSelect }, task: { select: { title: true } } },
  });
  if (!comment) throw Object.assign(new Error("Comentario no encontrado"), { statusCode: 404 });
  if (comment.authorId !== params.userId) {
    throw Object.assign(new Error("Solo el autor puede editar su comentario"), { statusCode: 403 });
  }

  const updated = await prisma.comment.update({
    where: { id: params.commentId },
    data: { body: params.body, editedAt: new Date() } as any,
    include: { author: { select: authorSelect } },
  });

  if (params.mentionedUserIds?.length) {
    const authorName = comment.author?.name ?? "Alguien";
    const uniqueIds = [...new Set(params.mentionedUserIds)].filter(id => id !== params.userId);
    const validUsers = await prisma.user.findMany({
      where: { id: { in: uniqueIds }, companyId: params.companyId },
      select: { id: true },
    });
    await Promise.all(
      validUsers.map(u =>
        createNotification({
          userId: u.id,
          message: `${authorName} te mencionó en un comentario editado en "${comment.task.title}"`,
          taskId: comment.taskId,
          category: "task_comments",
        })
      )
    );
  }

  return updated;
}

export async function remove(params: {
  companyId: string;
  userId: string;
  role: string;
  commentId: string;
}) {
  const comment = await prisma.comment.findFirst({
    where: { id: params.commentId, companyId: params.companyId },
  });
  if (!comment) throw Object.assign(new Error("El comentario no existe o no pertenece a tu empresa"), { statusCode: 404 });

  const isAdmin = String(params.role).toUpperCase() === "ADMIN";
  if (!isAdmin && comment.authorId !== params.userId) {
    throw Object.assign(new Error("Solo el autor o un administrador pueden borrar este comentario"), { statusCode: 403 });
  }

  await prisma.comment.delete({ where: { id: params.commentId } });
}

export async function toggleReaction(params: {
  companyId: string;
  userId: string;
  commentId: string;
  emoji: string;
}) {
  const comment = await prisma.comment.findFirst({
    where: { id: params.commentId, companyId: params.companyId },
  });
  if (!comment) throw Object.assign(new Error("Comentario no encontrado"), { statusCode: 404 });

  type ReactionMap = Record<string, string[]>;
  let reactions: ReactionMap = {};
  if (comment.reactions) {
    try { reactions = JSON.parse(comment.reactions); } catch {}
  }

  const users = reactions[params.emoji] ?? [];
  const idx = users.indexOf(params.userId);
  if (idx >= 0) {
    users.splice(idx, 1);
    if (users.length === 0) delete reactions[params.emoji];
    else reactions[params.emoji] = users;
  } else {
    reactions[params.emoji] = [...users, params.userId];
  }

  const hasReactions = Object.keys(reactions).length > 0;
  await prisma.comment.update({
    where: { id: params.commentId },
    data: { reactions: hasReactions ? JSON.stringify(reactions) : null },
  });

  return reactions;
}
