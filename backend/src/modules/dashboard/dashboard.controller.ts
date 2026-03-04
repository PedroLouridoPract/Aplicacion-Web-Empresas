import { Request, Response, NextFunction } from "express";
import * as service from "./dashboard.service";

export async function summary(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;

    const daysRaw = typeof req.query.days === "string" ? Number(req.query.days) : undefined;
    const days = daysRaw && Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 365 ? Math.floor(daysRaw) : undefined;

    const data = await service.getSummary({ companyId, projectId, days });
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

export async function projectMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const projectId = typeof req.params.projectId === "string" ? req.params.projectId : req.params.projectId?.[0];
    if (!projectId) return res.status(400).json({ message: "projectId es requerido" });

    const daysRaw = typeof req.query.days === "string" ? Number(req.query.days) : 30;
    const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 365 ? Math.floor(daysRaw) : 30;

    const data = await service.getProjectMetrics({ companyId, projectId, days });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function allMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const daysRaw = typeof req.query.days === "string" ? Number(req.query.days) : 30;
    const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 365 ? Math.floor(daysRaw) : 30;

    const data = await service.getAllMetrics({ companyId, days });
    res.json(data);
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
