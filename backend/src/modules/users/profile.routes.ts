import { Router } from "express";
import multer from "multer";
import { authRequired } from "../../middleware/auth";
import * as ctrl from "./profile.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Solo se permiten imágenes (jpg, png, gif, webp)"));
  },
});

export const profileRoutes = Router();

profileRoutes.get("/me", authRequired, ctrl.getProfile);
profileRoutes.patch("/me", authRequired, ctrl.updateProfile);
profileRoutes.patch("/me/password", authRequired, ctrl.changePassword);
profileRoutes.post("/me/avatar", authRequired, upload.single("avatar"), ctrl.uploadAvatar);
profileRoutes.get("/me/notification-preferences", authRequired, ctrl.getNotificationPreferences);
profileRoutes.patch("/me/notification-preferences", authRequired, ctrl.updateNotificationPreferences);
