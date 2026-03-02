import { Request, Response, NextFunction } from "express";
import * as service from "./dashboard.service";

export async function summary(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;

    const data = await service.getSummary({ companyId, projectId });
    const counts = data.counts?.byStatus ?? {};
    res.json({
      ...data,
      overdue: data.kpis?.overdueTasks ?? 0,
      backlog: counts.BACKLOG ?? 0,
      in_progress: counts.IN_PROGRESS ?? 0,
      review: counts.REVIEW ?? 0,
      done: counts.DONE ?? 0,
    });
  } catch (err) {
    next(err);
  }
}

export async function productivity(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;

    const daysRaw = typeof req.query.days === "string" ? Number(req.query.days) : 14;
    const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 365 ? Math.floor(daysRaw) : 14;

    const data = await service.getProductivity({ companyId, projectId, days });
    res.json(data);
  } catch (err) {
    next(err);
  }
}
