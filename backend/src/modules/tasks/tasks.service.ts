import { prisma } from "../../db/prisma";

const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

const taskSelect = {
  id: true,
  title: true,
  summary: true,
  description: true,
  assigneeId: true,
  creatorName: true,
  reporterName: true,
  dueDate: true,
  resolvedAt: true,
  priority: true,
  status: true,
  customStatus: true,
  progress: true,
  orderIndex: true,
  projectId: true,
  companyId: true,
  lockedById: true,
  lockedAt: true,
  lockedBy: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
  assignee: {
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  },
  attachments: {
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
};

const BASE_STATUS_KEYS = ["backlog", "in_progress", "review", "done"];
const KEY_TO_ENUM: Record<string, "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE"> = {
  backlog: "BACKLOG",
  in_progress: "IN_PROGRESS",
  review: "REVIEW",
  done: "DONE",
};

export async function moveTask(params: {
  taskId: string;
  companyId: string;
  status?: "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
  customStatus?: string | null;
  columnKey?: string;
  orderIndex: number;
}) {
  const task = await prisma.task.findFirst({
    where: { id: params.taskId, companyId: params.companyId },
    select: { id: true },
  });
  if (!task) throw Object.assign(new Error("La tarea no existe o no pertenece a tu empresa"), { statusCode: 404 });

  let status: "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
  let customStatus: string | null = null;

  if (params.columnKey) {
    if (BASE_STATUS_KEYS.includes(params.columnKey)) {
      status = KEY_TO_ENUM[params.columnKey];
      customStatus = null;
    } else {
      status = "BACKLOG";
      customStatus = params.columnKey;
    }
  } else {
    status = params.status ?? "BACKLOG";
    customStatus = params.customStatus ?? null;
  }

  return prisma.task.update({
    where: { id: params.taskId },
    data: {
      status,
      customStatus,
      orderIndex: params.orderIndex,
      ...(status === "DONE" && !customStatus
        ? { progress: 100, resolvedAt: new Date() }
        : { resolvedAt: null }),
    },
    select: taskSelect,
  });
}

export async function createTask(params: {
  companyId: string;
  data: {
    projectId: string;
    title: string;
    description?: string | null;
    assigneeId?: string | null;
    dueDate?: Date | null;
    priority?: "HIGH" | "MEDIUM" | "LOW";
    status?: "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
    customStatus?: string | null;
    progress?: number;
  };
}) {
  const project = await prisma.project.findFirst({
    where: { id: params.data.projectId, companyId: params.companyId },
  });
  if (!project) throw Object.assign(new Error("El proyecto no existe o no pertenece a tu empresa"), { statusCode: 404 });

  if (params.data.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: { id: params.data.assigneeId, companyId: params.companyId },
    });
    if (!assignee) throw Object.assign(new Error("El usuario asignado no existe en tu empresa"), { statusCode: 400 });
  }

  const maxOrder = await prisma.task.aggregate({
    where: { projectId: params.data.projectId, status: params.data.status ?? "BACKLOG" },
    _max: { orderIndex: true },
  });
  const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

  return prisma.task.create({
    data: {
      companyId: params.companyId,
      projectId: params.data.projectId,
      title: params.data.title,
      description: params.data.description ?? null,
      assigneeId: params.data.assigneeId ?? null,
      dueDate: params.data.dueDate ?? null,
      priority: params.data.priority ?? "MEDIUM",
      status: params.data.status ?? "BACKLOG",
      customStatus: params.data.customStatus ?? null,
      progress: params.data.progress ?? 0,
      orderIndex,
    },
    select: taskSelect,
  });
}

export async function getTaskById(params: { companyId: string; taskId: string }) {
  const task = await prisma.task.findFirst({
    where: { id: params.taskId, companyId: params.companyId },
    select: taskSelect,
  });
  if (!task) throw Object.assign(new Error("La tarea no existe o no pertenece a tu empresa"), { statusCode: 404 });
  return task;
}

export async function listTasksAssignedToMe(params: { companyId: string; userId: string }) {
  return prisma.task.findMany({
    where: { companyId: params.companyId, assigneeId: params.userId },
    select: {
      ...taskSelect,
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
  });
}

export async function updateTask(params: {
  companyId: string;
  taskId: string;
  data: {
    title?: string;
    description?: string | null;
    assigneeId?: string | null;
    dueDate?: Date | null;
    priority?: "HIGH" | "MEDIUM" | "LOW";
    status?: "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
    progress?: number;
    orderIndex?: number;
  };
}) {
  await getTaskById({ companyId: params.companyId, taskId: params.taskId });

  if (params.data.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: { id: params.data.assigneeId, companyId: params.companyId },
    });
    if (!assignee) throw Object.assign(new Error("El usuario asignado no existe en tu empresa"), { statusCode: 400 });
  }

  const data: Record<string, unknown> = { ...params.data };
  if (data.status === "DONE") {
    data.progress = 100;
    data.resolvedAt = new Date();
  } else if (data.status) {
    data.resolvedAt = null;
  }

  return prisma.task.update({
    where: { id: params.taskId },
    data,
    select: taskSelect,
  });
}

export async function deleteTask(params: { companyId: string; taskId: string }) {
  await getTaskById({ companyId: params.companyId, taskId: params.taskId });
  await prisma.attachment.deleteMany({ where: { taskId: params.taskId } });
  await prisma.comment.deleteMany({ where: { taskId: params.taskId, companyId: params.companyId } });
  await prisma.task.delete({ where: { id: params.taskId } });
}

export async function listTasks(params: {
  companyId: string;
  projectId?: string;
  assigneeId?: string;
  status?: string;
}) {
  const where: Record<string, unknown> = { companyId: params.companyId };
  if (params.projectId) where.projectId = params.projectId;
  if (params.assigneeId) where.assigneeId = params.assigneeId;
  if (params.status) where.status = params.status.toUpperCase();

  return prisma.task.findMany({
    where,
    select: {
      ...taskSelect,
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { orderIndex: "asc" }, { dueDate: "asc" }],
  });
}

function isLockExpired(lockedAt: Date | null): boolean {
  if (!lockedAt) return true;
  return Date.now() - lockedAt.getTime() > LOCK_TIMEOUT_MS;
}

export async function lockTask(params: { companyId: string; taskId: string; userId: string }) {
  const task = await prisma.task.findFirst({
    where: { id: params.taskId, companyId: params.companyId },
    select: { id: true, lockedById: true, lockedAt: true, lockedBy: { select: { id: true, name: true } } },
  });
  if (!task) throw Object.assign(new Error("La tarea no existe o no pertenece a tu empresa"), { statusCode: 404 });

  if (task.lockedById && task.lockedById !== params.userId && !isLockExpired(task.lockedAt)) {
    const lockerName = task.lockedBy?.name || "otro usuario";
    throw Object.assign(
      new Error(`Esta tarea está siendo editada por ${lockerName}. Inténtalo más tarde.`),
      { statusCode: 423 }
    );
  }

  return prisma.task.update({
    where: { id: params.taskId },
    data: { lockedById: params.userId, lockedAt: new Date() },
    select: taskSelect,
  });
}

export async function unlockTask(params: { companyId: string; taskId: string; userId: string }) {
  const task = await prisma.task.findFirst({
    where: { id: params.taskId, companyId: params.companyId },
    select: { id: true, lockedById: true },
  });
  if (!task) throw Object.assign(new Error("La tarea no existe o no pertenece a tu empresa"), { statusCode: 404 });

  if (task.lockedById && task.lockedById !== params.userId) {
    throw Object.assign(new Error("No puedes desbloquear una tarea bloqueada por otro usuario"), { statusCode: 403 });
  }

  return prisma.task.update({
    where: { id: params.taskId },
    data: { lockedById: null, lockedAt: null },
    select: taskSelect,
  });
}

export function isTaskLockedByOther(task: { lockedById: string | null; lockedAt: Date | null }, userId: string): boolean {
  if (!task.lockedById) return false;
  if (task.lockedById === userId) return false;
  return !isLockExpired(task.lockedAt);
}