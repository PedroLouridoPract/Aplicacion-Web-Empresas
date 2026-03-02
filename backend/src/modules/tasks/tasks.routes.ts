import { Router } from "express";
import { authRequired } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as ctrl from "./tasks.controller";

const canWrite = requireRole(["ADMIN", "MEMBER"], "crear o modificar tareas (los invitados solo pueden ver)");

export const tasksRoutes = Router();

tasksRoutes.get("/", authRequired, ctrl.list);
tasksRoutes.get("/mine", authRequired, ctrl.mine);
tasksRoutes.get("/:id", authRequired, ctrl.getById);
tasksRoutes.post("/", authRequired, canWrite, ctrl.create);
tasksRoutes.patch("/:id/move", authRequired, canWrite, ctrl.move);
tasksRoutes.patch("/:id", authRequired, canWrite, ctrl.update);
tasksRoutes.delete("/:id", authRequired, canWrite, ctrl.remove);
