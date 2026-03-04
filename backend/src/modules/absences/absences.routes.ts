import { Router } from "express";
import multer from "multer";
import { authRequired } from "../../middleware/auth";
import { requireRole, requireAdmin } from "../../middleware/rbac";
import * as ctrl from "./absences.controller";

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-rar-compressed",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Tipo de archivo no permitido."));
  },
});

const canCreate = requireRole(["ADMIN", "MEMBER"], "crear ausencias");

export const absencesRoutes = Router();

absencesRoutes.get("/", authRequired, ctrl.list);
absencesRoutes.post("/", authRequired, canCreate, upload.array("files", 5), ctrl.create);
absencesRoutes.patch("/bulk-status", authRequired, requireAdmin, ctrl.bulkUpdate);
absencesRoutes.get("/:id", authRequired, ctrl.getById);
absencesRoutes.patch("/:id/status", authRequired, requireAdmin, ctrl.updateStatus);
absencesRoutes.delete("/:id", authRequired, canCreate, ctrl.remove);

absencesRoutes.get("/:id/attachments", authRequired, ctrl.listAttachments);
absencesRoutes.get("/:id/attachments/:attId/download", authRequired, ctrl.downloadAttachment);
