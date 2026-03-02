import { Router } from "express";
import { authRequired } from "../../middleware/auth";
import * as ctrl from "./tasks.controller";

export const tasksRoutes = Router();

tasksRoutes.patch("/:id/move", authRequired, ctrl.move);