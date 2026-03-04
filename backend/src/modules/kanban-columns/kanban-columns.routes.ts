import { Router } from "express";
import { authRequired } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/rbac";
import * as ctrl from "./kanban-columns.controller";

export const kanbanColumnsRoutes = Router();

kanbanColumnsRoutes.get(
  "/projects/:projectId/columns",
  authRequired,
  ctrl.list,
);

kanbanColumnsRoutes.post(
  "/projects/:projectId/columns",
  authRequired,
  requireAdmin,
  ctrl.create,
);

kanbanColumnsRoutes.patch(
  "/projects/:projectId/columns/reorder",
  authRequired,
  requireAdmin,
  ctrl.reorder,
);

kanbanColumnsRoutes.patch(
  "/columns/:id",
  authRequired,
  requireAdmin,
  ctrl.update,
);

kanbanColumnsRoutes.delete(
  "/columns/:id",
  authRequired,
  requireAdmin,
  ctrl.remove,
);
