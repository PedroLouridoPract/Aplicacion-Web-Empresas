import { prisma } from "../../db/prisma";

type Role = "ADMIN" | "MEMBER" | "GUEST";

async function assertTaskInCompany(params: { taskId: string; companyId: string }) {
  const task = await prisma.task.findFirst({
    where: { id: params.taskId, companyId: params.companyId },
    select: { id: true, projectId: true },
  });

  if (!task) throw Object.assign(new Error("Task not found"), { statusCode: 404 });
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
  role: Role;
  taskId: string;
  body: string;
}) {
  // permisos: Guest no comenta
  if (params.role === "GUEST") {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

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