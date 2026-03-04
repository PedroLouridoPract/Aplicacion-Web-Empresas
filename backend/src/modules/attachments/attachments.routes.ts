import { Router } from "express";
import multer from "multer";
import { authRequired } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as ctrl from "./attachments.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const canWrite = requireRole(["ADMIN", "MEMBER"], "adjuntar archivos");

export const attachmentsRoutes = Router();

attachmentsRoutes.post(
  "/tasks/:taskId/attachments",
  authRequired,
  canWrite,
  upload.array("files", 10),
  ctrl.upload,
);

attachmentsRoutes.get(
  "/tasks/:taskId/attachments",
  authRequired,
  ctrl.list,
);

attachmentsRoutes.get(
  "/attachments/:id/download",
  authRequired,
  ctrl.download,
);

attachmentsRoutes.delete(
  "/attachments/:id",
  authRequired,
  canWrite,
  ctrl.remove,
);
