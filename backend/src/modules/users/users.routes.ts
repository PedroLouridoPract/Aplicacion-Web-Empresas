import { Router } from "express";
import { authRequired } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as ctrl from "./users.controller";

export const usersRoutes = Router();

usersRoutes.get("/", authRequired, ctrl.list);
usersRoutes.post("/", authRequired, requireRole(["ADMIN"], "crear usuarios (solo administradores)"), ctrl.create);
usersRoutes.patch("/:id", authRequired, requireRole(["ADMIN"], "modificar usuarios (solo administradores)"), ctrl.update);
