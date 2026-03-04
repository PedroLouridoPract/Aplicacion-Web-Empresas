import { prisma } from "../../db/prisma";

const BASE_COLUMNS = [
  { key: "backlog", label: "Backlog", position: 0 },
  { key: "in_progress", label: "En proceso", position: 1 },
  { key: "review", label: "En revisión", position: 2 },
  { key: "done", label: "Finalizado", position: 3 },
];

const columnSelect = {
  id: true,
  projectId: true,
  key: true,
  label: true,
  position: true,
  isBase: true,
  color: true,
  createdAt: true,
};

async function ensureBaseColumns(projectId: string) {
  const count = await prisma.kanbanColumn.count({ where: { projectId } });
  if (count > 0) return;

  await prisma.kanbanColumn.createMany({
    data: BASE_COLUMNS.map((c) => ({
      projectId,
      key: c.key,
      label: c.label,
      position: c.position,
      isBase: true,
    })),
  });
}

export async function listColumns(params: { projectId: string; companyId: string }) {
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, companyId: params.companyId },
    select: { id: true },
  });
  if (!project) {
    throw Object.assign(new Error("El proyecto no existe o no pertenece a tu empresa"), { statusCode: 404 });
  }

  await ensureBaseColumns(params.projectId);

  return prisma.kanbanColumn.findMany({
    where: { projectId: params.projectId },
    orderBy: { position: "asc" },
    select: columnSelect,
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

export async function createColumn(params: {
  projectId: string;
  companyId: string;
  label: string;
  color?: string;
}) {
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, companyId: params.companyId },
    select: { id: true },
  });
  if (!project) {
    throw Object.assign(new Error("El proyecto no existe o no pertenece a tu empresa"), { statusCode: 404 });
  }

  await ensureBaseColumns(params.projectId);

  let baseSlug = slugify(params.label);
  if (!baseSlug) baseSlug = "columna";
  let key = `custom_${baseSlug}`;

  const existing = await prisma.kanbanColumn.findUnique({
    where: { projectId_key: { projectId: params.projectId, key } },
  });
  if (existing) {
    key = `custom_${baseSlug}_${Date.now().toString(36)}`;
  }

  const maxPos = await prisma.kanbanColumn.aggregate({
    where: { projectId: params.projectId },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? -1) + 1;

  return prisma.kanbanColumn.create({
    data: {
      projectId: params.projectId,
      key,
      label: params.label,
      position,
      isBase: false,
      color: params.color ?? null,
    },
    select: columnSelect,
  });
}

export async function updateColumn(params: {
  columnId: string;
  companyId: string;
  label?: string;
  color?: string;
}) {
  const column = await prisma.kanbanColumn.findFirst({
    where: { id: params.columnId },
    include: { project: { select: { companyId: true } } },
  });

  if (!column || column.project.companyId !== params.companyId) {
    throw Object.assign(new Error("Columna no encontrada"), { statusCode: 404 });
  }

  const data: Record<string, unknown> = {};
  if (params.label !== undefined) data.label = params.label;
  if (params.color !== undefined) data.color = params.color;

  return prisma.kanbanColumn.update({
    where: { id: params.columnId },
    data,
    select: columnSelect,
  });
}

export async function reorderColumns(params: {
  projectId: string;
  companyId: string;
  orderedIds: string[];
}) {
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, companyId: params.companyId },
    select: { id: true },
  });
  if (!project) {
    throw Object.assign(new Error("El proyecto no existe o no pertenece a tu empresa"), { statusCode: 404 });
  }

  const columns = await prisma.kanbanColumn.findMany({
    where: { projectId: params.projectId },
    select: { id: true },
  });
  const columnIds = new Set(columns.map((c) => c.id));

  for (const id of params.orderedIds) {
    if (!columnIds.has(id)) {
      throw Object.assign(new Error(`Columna ${id} no pertenece a este proyecto`), { statusCode: 400 });
    }
  }

  const updates = params.orderedIds.map((id, index) =>
    prisma.kanbanColumn.update({ where: { id }, data: { position: index } })
  );

  await prisma.$transaction(updates);

  return prisma.kanbanColumn.findMany({
    where: { projectId: params.projectId },
    orderBy: { position: "asc" },
    select: columnSelect,
  });
}

const KEY_TO_STATUS: Record<string, "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE"> = {
  backlog: "BACKLOG",
  in_progress: "IN_PROGRESS",
  review: "REVIEW",
  done: "DONE",
};

export async function deleteColumn(params: {
  columnId: string;
  companyId: string;
}) {
  const column = await prisma.kanbanColumn.findFirst({
    where: { id: params.columnId },
    include: { project: { select: { companyId: true, id: true } } },
  });

  if (!column || column.project.companyId !== params.companyId) {
    throw Object.assign(new Error("Columna no encontrada"), { statusCode: 404 });
  }

  const remaining = await prisma.kanbanColumn.count({
    where: { projectId: column.projectId, id: { not: column.id } },
  });
  if (remaining < 1) {
    throw Object.assign(new Error("No puedes eliminar la última columna del tablero"), { statusCode: 400 });
  }

  const firstOther = await prisma.kanbanColumn.findFirst({
    where: { projectId: column.projectId, id: { not: column.id } },
    orderBy: { position: "asc" },
    select: { key: true, isBase: true },
  });
  const fallbackStatus = firstOther && KEY_TO_STATUS[firstOther.key] ? KEY_TO_STATUS[firstOther.key] : "BACKLOG";
  const fallbackCustom = firstOther && !KEY_TO_STATUS[firstOther.key] ? firstOther.key : null;

  if (column.isBase) {
    const enumStatus = KEY_TO_STATUS[column.key];
    if (enumStatus) {
      await prisma.task.updateMany({
        where: { projectId: column.projectId, status: enumStatus, customStatus: null },
        data: { status: fallbackStatus, customStatus: fallbackCustom },
      });
    }
  }

  await prisma.task.updateMany({
    where: { projectId: column.projectId, customStatus: column.key },
    data: { status: fallbackStatus, customStatus: fallbackCustom },
  });

  await prisma.kanbanColumn.delete({ where: { id: params.columnId } });
}
