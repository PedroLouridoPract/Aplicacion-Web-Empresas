import { prisma } from "../../db/prisma";

type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
type Priority = "HIGH" | "MEDIUM" | "LOW";

function taskWhere(params: { companyId: string; projectId?: string }) {
  return {
    companyId: params.companyId,
    ...(params.projectId ? { projectId: params.projectId } : {}),
  };
}

export async function getSummary(params: { companyId: string; projectId?: string }) {
  const now = new Date();

  const baseWhere = taskWhere(params);

  const [totalTasks, overdueTasks, byStatus, byPriority] = await Promise.all([
    prisma.task.count({ where: baseWhere }),
    prisma.task.count({
      where: {
        ...baseWhere,
        status: { not: "DONE" },
        dueDate: { lt: now },
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

export async function getProductivity(params: { companyId: string; projectId?: string; days: number }) {
  const now = new Date();
  const from = new Date(now.getTime() - params.days * 24 * 60 * 60 * 1000);

  const baseWhere = taskWhere(params);

  // Lista de usuarios de la empresa (y con esto armamos la tabla)
  const users = await prisma.user.findMany({
    where: { companyId: params.companyId },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  // 1) DONE en ventana (últimos N días) por usuario
  const doneAgg = await prisma.task.groupBy({
    by: ["assigneeId"],
    where: {
      ...baseWhere,
      status: "DONE",
      updatedAt: { gte: from, lte: now }, // aproximación de "completadas recientemente"
      assigneeId: { not: null },
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

  // 3) OVERDUE actuales por usuario
  const overdueAgg = await prisma.task.groupBy({
    by: ["assigneeId"],
    where: {
      ...baseWhere,
      status: { not: "DONE" },
      dueDate: { lt: now },
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