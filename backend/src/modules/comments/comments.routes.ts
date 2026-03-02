import { Router } from "express";
import { authRequired } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as ctrl from "./comments.controller";

const canWrite = requireRole(["ADMIN", "MEMBER"], "escribir comentarios (los invitados solo pueden ver)");

export const commentsRoutes = Router();

commentsRoutes.get("/by-task/:taskId", authRequired, ctrl.listByTask);
commentsRoutes.post("/", authRequired, canWrite, ctrl.create);
commentsRoutes.delete("/:id", authRequired, canWrite, ctrl.remove);
