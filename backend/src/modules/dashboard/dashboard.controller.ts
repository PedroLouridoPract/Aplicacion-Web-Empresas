import { Request, Response } from "express";
import * as service from "./dashboard.service";

export async function summary(req: Request, res: Response) {
  const { companyId } = req.user!;
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;

  const data = await service.getSummary({ companyId, projectId });
  res.json(data);
}

export async function productivity(req: Request, res: Response) {
  const { companyId } = req.user!;
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;

  // ventana de días (por defecto 14)
  const daysRaw = typeof req.query.days === "string" ? Number(req.query.days) : 14;
  const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 365 ? Math.floor(daysRaw) : 14;

  const data = await service.getProductivity({ companyId, projectId, days });
  res.json(data);
}