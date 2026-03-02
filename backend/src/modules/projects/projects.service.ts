import { prisma } from "../../db/prisma";

export async function listProjects(params: { companyId: string }) {
  return prisma.project.findMany({
    where: { companyId: params.companyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProject(params: {
  companyId: string;
  data: {
    name: string;
    description?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    status?: string | null;
  };
}) {
  return prisma.project.create({
    data: {
      companyId: params.companyId,
      name: params.data.name,
      description: params.data.description ?? null,
      startDate: params.data.startDate ?? null,
      endDate: params.data.endDate ?? null,
      status: params.data.status ?? "ACTIVE",
    },
  });
}

export async function getProjectById(params: { companyId: string; projectId: string }) {
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, companyId: params.companyId },
  });

  if (!project) throw Object.assign(new Error("El proyecto no existe o no pertenece a tu empresa"), { statusCode: 404 });
  return project;
}

export async function updateProject(params: {
  companyId: string;
  projectId: string;
  data: {
    name?: string;
    description?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    status?: string | null;
  };
}) {
  await getProjectById({ companyId: params.companyId, projectId: params.projectId });

  const { status, ...rest } = params.data;
  return prisma.project.update({
    where: { id: params.projectId },
    data: {
      ...rest,
      ...(status != null && { status }),
    },
  });
}

export async function deleteProject(params: { companyId: string; projectId: string }) {
  // Multi-tenant check
  await getProjectById({ companyId: params.companyId, projectId: params.projectId });

  // Importante: si tienes tasks relacionadas, puedes:
  // - borrar en cascada (si lo configuraste)
  // - o borrar tasks primero
  await prisma.task.deleteMany({
    where: { companyId: params.companyId, projectId: params.projectId },
  });

  return prisma.project.delete({
    where: { id: params.projectId },
  });
}

const taskSelect = {
  id: true,
  title: true,
  description: true,
  assigneeId: true,
  dueDate: true,
  priority: true,
  status: true,
  progress: true,
  orderIndex: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
  assignee: {
    select: { id: true, name: true, email: true, role: true },
  },
};

export async function listTasksByProject(params: { companyId: string; projectId: string }) {
  await getProjectById({ companyId: params.companyId, projectId: params.projectId });
  return prisma.task.findMany({
    where: { companyId: params.companyId, projectId: params.projectId },
    select: taskSelect,
    orderBy: [{ status: "asc" }, { orderIndex: "asc" }, { dueDate: "asc" }],
  });
}

export async function getExecutiveView(params: { companyId: string; projectId: string }) {
  await getProjectById({ companyId: params.companyId, projectId: params.projectId });
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  const startOfNextWeek = new Date(endOfWeek.getTime() + 1);
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
  endOfNextWeek.setHours(23, 59, 59, 999);

  const baseWhere = { companyId: params.companyId, projectId: params.projectId };

  const [overdue, thisWeek, nextWeek] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...baseWhere,
        status: { not: "DONE" },
        dueDate: { lt: startOfToday },
      },
      select: taskSelect,
      orderBy: [{ dueDate: "asc" }, { orderIndex: "asc" }],
    }),
    prisma.task.findMany({
      where: {
        ...baseWhere,
        dueDate: { gte: startOfWeek, lte: endOfWeek },
      },
      select: taskSelect,
      orderBy: [{ dueDate: "asc" }, { orderIndex: "asc" }],
    }),
    prisma.task.findMany({
      where: {
        ...baseWhere,
        dueDate: { gte: startOfNextWeek, lte: endOfNextWeek },
      },
      select: taskSelect,
      orderBy: [{ dueDate: "asc" }, { orderIndex: "asc" }],
    }),
  ]);

  return { overdue, this_week: thisWeek, next_week: nextWeek };
}