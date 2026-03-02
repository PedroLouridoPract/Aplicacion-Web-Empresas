import { Router } from "express";
import { authRequired } from "../../middleware/auth";
import * as ctrl from "./dashboard.controller";

export const dashboardRoutes = Router();

// Resumen (KPIs) + conteos por estado/prioridad
dashboardRoutes.get("/summary", authRequired, ctrl.summary);

// Productividad por usuario
dashboardRoutes.get("/productivity", authRequired, ctrl.productivity);