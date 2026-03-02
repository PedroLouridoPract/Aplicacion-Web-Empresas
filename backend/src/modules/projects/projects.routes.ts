import { Router } from "express";
import { authRequired } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as ctrl from "./projects.controller";

export const projectsRoutes = Router();

projectsRoutes.get("/", authRequired, ctrl.list);
projectsRoutes.get("/:id", authRequired, ctrl.getById);
projectsRoutes.get("/:id/tasks", authRequired, ctrl.listTasks);
projectsRoutes.get("/:id/executive", authRequired, ctrl.executive);

projectsRoutes.post("/", authRequired, requireRole(["ADMIN"], "crear proyectos (solo administradores)"), ctrl.create);
projectsRoutes.patch("/:id", authRequired, requireRole(["ADMIN", "MEMBER"], "editar proyectos (los invitados solo pueden ver)"), ctrl.update);
projectsRoutes.delete("/:id", authRequired, requireRole(["ADMIN"], "eliminar proyectos (solo administradores)"), ctrl.remove);
