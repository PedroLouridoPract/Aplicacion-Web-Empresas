import { Router } from "express";
import { authRequired } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as ctrl from "./dashboard.controller";

export const dashboardRoutes = Router();

dashboardRoutes.get("/summary", authRequired, requireRole(["ADMIN"], "ver estadisticas del dashboard (solo administradores)"), ctrl.summary);
dashboardRoutes.get("/metrics", authRequired, requireRole(["ADMIN"], "ver métricas globales (solo administradores)"), ctrl.allMetrics);
dashboardRoutes.get("/productivity", authRequired, requireRole(["ADMIN"], "ver productividad del equipo (solo administradores)"), ctrl.productivity);

export const projectMetricsRoutes = Router();
projectMetricsRoutes.get(
  "/projects/:projectId/metrics",
  authRequired,
  requireRole(["ADMIN"], "ver métricas del proyecto (solo administradores)"),
  ctrl.projectMetrics,
);
