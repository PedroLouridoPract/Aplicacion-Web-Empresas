import { prisma } from "../../db/prisma";

async function assertTaskInCompany(params: { taskId: string; companyId: string }) {
  const task = await prisma.task.findFirst({
    where: { id: params.taskId, companyId: params.companyId },
    select: { id: true, projectId: true },
  });

  if (!task) throw Object.assign(new Error("La tarea no existe o no pertenece a tu empresa"), { statusCode: 404 });
  return task;
}

export async function listByTask(params: { companyId: string; taskId: string }) {
  await assertTaskInCompany({ taskId: params.taskId, companyId: params.companyId });

  return prisma.comment.findMany({
    where: { companyId: params.companyId, taskId: params.taskId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function create(params: {
  companyId: string;
  userId: string;
  taskId: string;
  body: string;
}) {
  await assertTaskInCompany({ taskId: params.taskId, companyId: params.companyId });

  return prisma.comment.create({
    data: {
      companyId: params.companyId,
      taskId: params.taskId,
      authorId: params.userId,
      body: params.body,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });
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
