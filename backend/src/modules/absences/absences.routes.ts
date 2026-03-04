import { Router } from "express";
import multer from "multer";
import { authRequired } from "../../middleware/auth";
import { requireRole, requireAdmin } from "../../middleware/rbac";
import * as ctrl from "./absences.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const canCreate = requireRole(["ADMIN", "MEMBER"], "crear ausencias");

export const absencesRoutes = Router();

absencesRoutes.get("/", authRequired, ctrl.list);
absencesRoutes.post("/", authRequired, canCreate, upload.array("files", 10), ctrl.create);
absencesRoutes.patch("/bulk-status", authRequired, requireAdmin, ctrl.bulkUpdate);
absencesRoutes.get("/:id", authRequired, ctrl.getById);
absencesRoutes.patch("/:id/status", authRequired, requireAdmin, ctrl.updateStatus);
absencesRoutes.delete("/:id", authRequired, canCreate, ctrl.remove);

absencesRoutes.get("/:id/attachments", authRequired, ctrl.listAttachments);
absencesRoutes.get("/:id/attachments/:attId/download", authRequired, ctrl.downloadAttachment);
