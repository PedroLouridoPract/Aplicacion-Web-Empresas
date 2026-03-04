import { prisma } from "../../db/prisma";

export type NotificationCategory =
  | "task_assignment"
  | "task_comments"
  | "absence_requests"
  | "absence_status";

export async function createNotification(params: {
  userId: string;
  message: string;
  taskId?: string;
  absenceId?: string;
  category?: NotificationCategory;
}) {
  if (params.category) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { notificationPreferences: true },
    });
    const prefs = (user?.notificationPreferences as Record<string, boolean> | null) ?? {};
    if (prefs[params.category] === false) return null;
  }

  return prisma.notification.create({
    data: {
      userId: params.userId,
      message: params.message,
      taskId: params.taskId ?? null,
      absenceId: params.absenceId ?? null,
    },
  });
}

export async function getNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function markAsRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function deleteAll(userId: string) {
  return prisma.notification.deleteMany({ where: { userId } });
}
