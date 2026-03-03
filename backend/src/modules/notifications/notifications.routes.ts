import { Router } from "express";
import { authRequired } from "../../middleware/auth";
import * as ctrl from "./notifications.controller";

export const notificationsRoutes = Router();

notificationsRoutes.get("/", authRequired, ctrl.list);
notificationsRoutes.patch("/:id/read", authRequired, ctrl.markRead);
notificationsRoutes.patch("/read-all", authRequired, ctrl.markAllRead);
notificationsRoutes.delete("/", authRequired, ctrl.removeAll);
