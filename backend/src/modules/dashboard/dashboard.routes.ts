import { Router } from "express";
import { authRequired } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as ctrl from "./dashboard.controller";

export const dashboardRoutes = Router();

dashboardRoutes.get("/summary", authRequired, requireRole(["ADMIN"], "ver estadisticas del dashboard (solo administradores)"), ctrl.summary);
dashboardRoutes.get("/productivity", authRequired, requireRole(["ADMIN"], "ver productividad del equipo (solo administradores)"), ctrl.productivity);
