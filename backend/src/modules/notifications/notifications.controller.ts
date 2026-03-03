import { Request, Response, NextFunction } from "express";
import * as service from "./notifications.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const notifications = await service.getNotifications(userId);
    const unreadCount = await service.getUnreadCount(userId);
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const notifId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!notifId) return res.status(400).json({ message: "Invalid notification id" });
    await service.markAsRead(userId, notifId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    await service.markAllAsRead(userId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function removeAll(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    await service.deleteAll(userId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
