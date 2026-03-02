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

  if (!project) throw Object.assign(new Error("Project not found"), { statusCode: 404 });
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
  // Multi-tenant check
  await getProjectById({ companyId: params.companyId, projectId: params.projectId });

  return prisma.project.update({
    where: { id: params.projectId },
    data: params.data,
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