import { Router } from "express";
import { authRequired } from "../../middleware/auth";
import * as ctrl from "./comments.controller";

export const commentsRoutes = Router();

// Listar comentarios de una tarea
commentsRoutes.get("/by-task/:taskId", authRequired, ctrl.listByTask);

// Crear comentario
commentsRoutes.post("/", authRequired, ctrl.create);