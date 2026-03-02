import { prisma } from "../../db/prisma";

export async function moveTask(params: {
  taskId: string;
  companyId: string;
  status: "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
  orderIndex: number;
}) {
  // Asegura multi-tenant
  const task = await prisma.task.findFirst({
    where: { id: params.taskId, companyId: params.companyId },
    select: { id: true },
  });
  if (!task) throw Object.assign(new Error("Task not found"), { statusCode: 404 });

  return prisma.task.update({
    where: { id: params.taskId },
    data: { status: params.status, orderIndex: params.orderIndex },
  });
}