import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { hashPassword, verifyPassword } from "../../utils/hash";

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const profileSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  companyId: true,
  createdAt: true,
  company: { select: { name: true } },
} as const;

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: profileSelect,
    });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateProfileSchema.parse(req.body);
    const userId = req.user!.id;

    if (parsed.email) {
      const existing = await prisma.user.findFirst({
        where: { email: parsed.email.toLowerCase(), id: { not: userId } },
      });
      if (existing) {
        return res.status(409).json({ message: "Ese email ya está registrado en el sistema" });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.name != null) updateData.name = parsed.name;
    if (parsed.email != null) updateData.email = parsed.email.toLowerCase();
    if (parsed.phone !== undefined) updateData.phone = parsed.phone;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: profileSelect,
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = changePasswordSchema.parse(req.body);
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const valid = await verifyPassword(parsed.currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ message: "La contraseña actual es incorrecta" });
    }

    const newHash = await hashPassword(parsed.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    next(err);
  }
}

export async function uploadAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No se recibió ninguna imagen" });
    }

    const base64 = req.file.buffer.toString("base64");
    const avatarUrl = `data:${req.file.mimetype};base64,${base64}`;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl },
      select: profileSelect,
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function getNotificationPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { notificationPreferences: true },
    });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user.notificationPreferences || {});
  } catch (err) {
    next(err);
  }
}

export async function updateNotificationPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const prefs = req.body;
    if (typeof prefs !== "object" || prefs === null || Array.isArray(prefs)) {
      return res.status(400).json({ message: "Formato de preferencias inválido" });
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { notificationPreferences: prefs },
      select: { notificationPreferences: true },
    });
    res.json(user.notificationPreferences);
  } catch (err) {
    next(err);
  }
}
