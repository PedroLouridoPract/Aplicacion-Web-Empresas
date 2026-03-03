import { Router } from "express";
import multer from "multer";
import { authRequired } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import * as ctrl from "./import.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["text/csv", "application/vnd.ms-excel", "text/plain"];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos CSV"));
    }
  },
});

const canImport = requireRole(["ADMIN", "MEMBER"], "importar tareas");

export const importRoutes = Router();

importRoutes.post(
  "/tasks",
  authRequired,
  canImport,
  upload.single("file"),
  ctrl.importTasks,
);

importRoutes.post(
  "/preview",
  authRequired,
  upload.single("file"),
  ctrl.previewCsv,
);
