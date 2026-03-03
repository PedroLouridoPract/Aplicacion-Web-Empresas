import { Router } from "express";
import multer from "multer";
import { authRequired } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as ctrl from "./attachments.controller";

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
    cb(new Error("Tipo de archivo no permitido. Se aceptan imágenes, PDF, documentos Office, CSV y archivos comprimidos."));
  },
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
