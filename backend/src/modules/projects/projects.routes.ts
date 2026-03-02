import { Router } from "express";
import { authRequired } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/rbac";
import * as ctrl from "./projects.controller";

export const projectsRoutes = Router();

// Todos autenticados pueden ver proyectos de su empresa
projectsRoutes.get("/", authRequired, ctrl.list);
projectsRoutes.get("/:id", authRequired, ctrl.getById);

// Solo ADMIN crea/edita/borrar proyectos
projectsRoutes.post("/", authRequired, requireAdmin, ctrl.create);
projectsRoutes.patch("/:id", authRequired, requireAdmin, ctrl.update);
projectsRoutes.delete("/:id", authRequired, requireAdmin, ctrl.remove);