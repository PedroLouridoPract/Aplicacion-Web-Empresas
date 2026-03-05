import { prisma } from "../../db/prisma";

type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
type Priority = "HIGH" | "MEDIUM" | "LOW";

function taskWhere(params: { companyId: string; projectId?: string }) {
  return {
    companyId: params.companyId,
    ...(params.projectId ? { projectId: params.projectId } : {}),
  };
}

export async function getSummary(params: { companyId: string; projectId?: string; days?: number }) {
  const now = new Date();

  const baseWhere: Record<string, unknown> = { ...taskWhere(params) };
  if (params.days) {
    const from = new Date(now.getTime() - params.days * 24 * 60 * 60 * 1000);
    baseWhere.createdAt = { gte: from };
  }

  const [totalTasks, overdueTasks, byStatus, byPriority] = await Promise.all([
    prisma.task.count({ where: baseWhere }),
    prisma.task.count({
      where: {
        ...baseWhere,
        status: { not: "DONE" },
        dueDate: { not: null, lt: now },
      },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["priority"],
      where: baseWhere,
      _count: { _all: true },
    }),
  ]);

  const statusCounts: Record<TaskStatus, number> = {
    BACKLOG: 0,
    IN_PROGRESS: 0,
    REVIEW: 0,
    DONE: 0,
  };

  for (const row of byStatus) {
    const status = row.status as TaskStatus;
    statusCounts[status] = row._count._all;
  }

  const priorityCounts: Record<Priority, number> = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  for (const row of byPriority) {
    const pr = row.priority as Priority;
    priorityCounts[pr] = row._count._all;
  }

  return {
    scope: params.projectId ? "PROJECT" : "COMPANY",
    projectId: params.projectId ?? null,
    kpis: {
      totalTasks,
      overdueTasks,
    },
    counts: {
      byStatus: statusCounts,
      byPriority: priorityCounts,
    },
    generatedAt: now.toISOString(),
  };
}

const STATUS_KEY_MAP: Record<string, string> = {
  BACKLOG: "backlog",
  IN_PROGRESS: "in_progress",
  REVIEW: "review",
  DONE: "done",
};

export async function getProjectMetrics(params: {
  companyId: string;
  projectId: string;
  days: number;
}) {
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, companyId: params.companyId },
    select: { id: true, name: true },
  });
  if (!project) {
    throw Object.assign(new Error("El proyecto no existe o no pertenece a tu empresa"), { statusCode: 404 });
  }

  const now = new Date();
  const daysMs = params.days * 24 * 60 * 60 * 1000;
  const from = new Date(now.getTime() - daysMs);
  const from7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [columns, tasks, users] = await Promise.all([
    prisma.kanbanColumn.findMany({
      where: { projectId: params.projectId },
      orderBy: { position: "asc" },
      select: { key: true, label: true, color: true, isBase: true, position: true },
    }),
    prisma.task.findMany({
      where: { companyId: params.companyId, projectId: params.projectId },
      select: {
        id: true, status: true, customStatus: true, assigneeId: true,
        priority: true, dueDate: true, resolvedAt: true, createdAt: true, progress: true,
      },
    }),
    prisma.user.findMany({
      where: { companyId: params.companyId },
      select: { id: true, name: true, avatarUrl: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const colMap = new Map(columns.map((c) => [c.key, c]));
  const colCounts = new Map<string, number>();
  for (const c of columns) colCounts.set(c.key, 0);

  let totalProgress = 0;
  let progressCount = 0;
  let resolutionHoursTotal = 0;
  let resolutionCount = 0;
  let overdueTasks = 0;
  let velocity7d = 0;
  let velocity30d = 0;

  const priorityCounts: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const userMap = new Map<string, { total: number; done: number; inProgress: number; overdue: number }>();

  const trendCreated = new Map<string, number>();
  const trendCompleted = new Map<string, number>();

  for (const t of tasks) {
    let colKey = t.customStatus || STATUS_KEY_MAP[t.status] || "backlog";
    if (!colMap.has(colKey)) colKey = "backlog";

    colCounts.set(colKey, (colCounts.get(colKey) ?? 0) + 1);

    if (t.progress != null) {
      totalProgress += t.progress;
      progressCount++;
    }

    const isDone = t.status === "DONE";
    if (isDone && t.resolvedAt) {
      const hours = (t.resolvedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60);
      resolutionHoursTotal += hours;
      resolutionCount++;
      if (t.resolvedAt >= from7d) velocity7d++;
      if (t.resolvedAt >= from) velocity30d++;
    }

    if (!isDone && t.dueDate && t.dueDate < now) {
      overdueTasks++;
    }

    priorityCounts[t.priority] = (priorityCounts[t.priority] ?? 0) + 1;

    if (t.assigneeId) {
      if (!userMap.has(t.assigneeId)) {
        userMap.set(t.assigneeId, { total: 0, done: 0, inProgress: 0, overdue: 0 });
      }
      const u = userMap.get(t.assigneeId)!;
      u.total++;
      if (isDone) u.done++;
      if (t.status === "IN_PROGRESS") u.inProgress++;
      if (!isDone && t.dueDate && t.dueDate < now) u.overdue++;
    }

    const createdDay = t.createdAt.toISOString().slice(0, 10);
    if (t.createdAt >= from) {
      trendCreated.set(createdDay, (trendCreated.get(createdDay) ?? 0) + 1);
    }
    if (isDone && t.resolvedAt && t.resolvedAt >= from) {
      const resolvedDay = t.resolvedAt.toISOString().slice(0, 10);
      trendCompleted.set(resolvedDay, (trendCompleted.get(resolvedDay) ?? 0) + 1);
    }
  }

  const byColumn = columns.map((c) => ({
    key: c.key,
    label: c.label,
    color: c.color ?? null,
    count: colCounts.get(c.key) ?? 0,
    isBase: c.isBase,
  }));

  const userIndex = new Map(users.map((u) => [u.id, u]));
  const byUser = [...userMap.entries()]
    .map(([uid, m]) => {
      const u = userIndex.get(uid);
      return u ? { user: { id: u.id, name: u.name, avatarUrl: u.avatarUrl }, ...m } : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.done - a.done || b.total - a.total);

  const trend: Array<{ date: string; created: number; completed: number }> = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(now);
  endDay.setHours(0, 0, 0, 0);
  while (cursor <= endDay) {
    const d = cursor.toISOString().slice(0, 10);
    trend.push({
      date: d,
      created: trendCreated.get(d) ?? 0,
      completed: trendCompleted.get(d) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    projectId: params.projectId,
    projectName: project.name,
    days: params.days,
    totalTasks: tasks.length,
    overdueTasks,
    avgProgress: progressCount > 0 ? Math.round(totalProgress / progressCount) : 0,
    avgResolutionHours: resolutionCount > 0 ? Math.round((resolutionHoursTotal / resolutionCount) * 10) / 10 : null,
    velocity: { last7d: velocity7d, last30d: velocity30d },
    byColumn,
    byPriority: priorityCounts,
    byUser,
    trend,
    generatedAt: now.toISOString(),
  };
}

export async function getAllMetrics(params: { companyId: string; days: number }) {
  const now = new Date();
  const daysMs = params.days * 24 * 60 * 60 * 1000;
  const from = new Date(now.getTime() - daysMs);
  const from7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [columns, tasks, users] = await Promise.all([
    prisma.kanbanColumn.findMany({
      where: { project: { companyId: params.companyId } },
      orderBy: { position: "asc" },
      select: { key: true, label: true, color: true, isBase: true, position: true },
    }),
    prisma.task.findMany({
      where: { companyId: params.companyId },
      select: {
        id: true, status: true, customStatus: true, assigneeId: true,
        priority: true, dueDate: true, resolvedAt: true, createdAt: true, progress: true,
      },
    }),
    prisma.user.findMany({
      where: { companyId: params.companyId },
      select: { id: true, name: true, avatarUrl: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const uniqueCols = new Map<string, { key: string; label: string; color: string | null; isBase: boolean; position: number }>();
  for (const c of columns) {
    if (!uniqueCols.has(c.key)) {
      uniqueCols.set(c.key, { key: c.key, label: c.label, color: c.color, isBase: c.isBase, position: c.position });
    }
  }
  const colList = [...uniqueCols.values()].sort((a, b) => {
    if (a.isBase && !b.isBase) return -1;
    if (!a.isBase && b.isBase) return 1;
    return a.position - b.position;
  });
  const colKeys = new Set(colList.map((c) => c.key));
  const colCounts = new Map<string, number>();
  for (const c of colList) colCounts.set(c.key, 0);

  let totalProgress = 0;
  let progressCount = 0;
  let resolutionHoursTotal = 0;
  let resolutionCount = 0;
  let overdueTasks = 0;
  let velocity7d = 0;
  let velocity30d = 0;

  const priorityCounts: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const userMap = new Map<string, { total: number; done: number; inProgress: number; overdue: number }>();

  const trendCreated = new Map<string, number>();
  const trendCompleted = new Map<string, number>();

  for (const t of tasks) {
    let colKey = t.customStatus || STATUS_KEY_MAP[t.status] || "backlog";
    if (!colKeys.has(colKey)) colKey = "backlog";
    colCounts.set(colKey, (colCounts.get(colKey) ?? 0) + 1);

    if (t.progress != null) {
      totalProgress += t.progress;
      progressCount++;
    }

    const isDone = t.status === "DONE";
    if (isDone && t.resolvedAt) {
      const hours = (t.resolvedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60);
      resolutionHoursTotal += hours;
      resolutionCount++;
      if (t.resolvedAt >= from7d) velocity7d++;
      if (t.resolvedAt >= from) velocity30d++;
    }

    if (!isDone && t.dueDate && t.dueDate < now) overdueTasks++;

    priorityCounts[t.priority] = (priorityCounts[t.priority] ?? 0) + 1;

    if (t.assigneeId) {
      if (!userMap.has(t.assigneeId)) {
        userMap.set(t.assigneeId, { total: 0, done: 0, inProgress: 0, overdue: 0 });
      }
      const u = userMap.get(t.assigneeId)!;
      u.total++;
      if (isDone) u.done++;
      if (t.status === "IN_PROGRESS") u.inProgress++;
      if (!isDone && t.dueDate && t.dueDate < now) u.overdue++;
    }

    const createdDay = t.createdAt.toISOString().slice(0, 10);
    if (t.createdAt >= from) {
      trendCreated.set(createdDay, (trendCreated.get(createdDay) ?? 0) + 1);
    }
    if (isDone && t.resolvedAt && t.resolvedAt >= from) {
      const resolvedDay = t.resolvedAt.toISOString().slice(0, 10);
      trendCompleted.set(resolvedDay, (trendCompleted.get(resolvedDay) ?? 0) + 1);
    }
  }

  const byColumn = colList.map((c) => ({
    key: c.key,
    label: c.label,
    color: c.color ?? null,
    count: colCounts.get(c.key) ?? 0,
    isBase: c.isBase,
  }));

  const userIndex = new Map(users.map((u) => [u.id, u]));
  const byUser = [...userMap.entries()]
    .map(([uid, m]) => {
      const u = userIndex.get(uid);
      return u ? { user: { id: u.id, name: u.name, avatarUrl: u.avatarUrl }, ...m } : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.done - a.done || b.total - a.total);

  const trend: Array<{ date: string; created: number; completed: number }> = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(now);
  endDay.setHours(0, 0, 0, 0);
  while (cursor <= endDay) {
    const d = cursor.toISOString().slice(0, 10);
    trend.push({ date: d, created: trendCreated.get(d) ?? 0, completed: trendCompleted.get(d) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    projectId: null,
    projectName: "Todos los proyectos",
    days: params.days,
    totalTasks: tasks.length,
    overdueTasks,
    avgProgress: progressCount > 0 ? Math.round(totalProgress / progressCount) : 0,
    avgResolutionHours: resolutionCount > 0 ? Math.round((resolutionHoursTotal / resolutionCount) * 10) / 10 : null,
    velocity: { last7d: velocity7d, last30d: velocity30d },
    byColumn,
    byPriority: priorityCounts,
    byUser,
    trend,
    generatedAt: now.toISOString(),
  };
}

export async function getProductivity(params: { companyId: string; projectId?: string; days: number }) {
  const now = new Date();
  const from = new Date(now.getTime() - params.days * 24 * 60 * 60 * 1000);

  const baseWhere = taskWhere(params);

  // Lista de usuarios de la empresa (y con esto armamos la tabla)
  const users = await prisma.user.findMany({
    where: { companyId: params.companyId },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });

  // 1) DONE en ventana (últimos N días) por usuario — usa resolvedAt si existe, sino updatedAt
  const doneAgg = await prisma.task.groupBy({
    by: ["assigneeId"],
    where: {
      ...baseWhere,
      status: "DONE",
      assigneeId: { not: null },
      OR: [
        { resolvedAt: { gte: from, lte: now } },
        { resolvedAt: null, updatedAt: { gte: from, lte: now } },
      ],
    },
    _count: { _all: true },
  });

  // 2) IN_PROGRESS actuales por usuario
  const inProgressAgg = await prisma.task.groupBy({
    by: ["assigneeId"],
    where: {
      ...baseWhere,
      status: "IN_PROGRESS",
      assigneeId: { not: null },
    },
    _count: { _all: true },
  });

  // 3) OVERDUE actuales por usuario (solo tareas con dueDate definido)
  const overdueAgg = await prisma.task.groupBy({
    by: ["assigneeId"],
    where: {
      ...baseWhere,
      status: { not: "DONE" },
      dueDate: { not: null, lt: now },
      assigneeId: { not: null },
    },
    _count: { _all: true },
  });

  const mapCounts = (rows: Array<{ assigneeId: string | null; _count: { _all: number } }>) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.assigneeId) m.set(r.assigneeId, r._count._all);
    }
    return m;
  };

  const doneMap = mapCounts(doneAgg);
  const inProgMap = mapCounts(inProgressAgg);
  const overdueMap = mapCounts(overdueAgg);

  const perUser = users.map((u) => ({
    user: u,
    metrics: {
      doneLastNDays: doneMap.get(u.id) ?? 0,
      inProgressNow: inProgMap.get(u.id) ?? 0,
      overdueNow: overdueMap.get(u.id) ?? 0,
    },
  }));

  return {
    scope: params.projectId ? "PROJECT" : "COMPANY",
    projectId: params.projectId ?? null,
    windowDays: params.days,
    window: { from: from.toISOString(), to: now.toISOString() },
    perUser,
    generatedAt: now.toISOString(),
  };
}