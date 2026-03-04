import { Request, Response, NextFunction } from "express";
import { createAbsenceSchema, updateAbsenceStatusSchema, bulkUpdateStatusSchema } from "./absences.schemas";
import * as service from "./absences.service";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: userId } = req.user!;
    const parsed = createAbsenceSchema.parse(req.body);

    const user = await (await import("../../db/prisma")).prisma.user.findFirst({
      where: { id: userId },
      select: { name: true },
    });

    const files = req.files as Express.Multer.File[] | undefined;

    const absence = await service.createAbsence({
      companyId,
      employeeId: userId,
      employeeName: user?.name || "Usuario",
      data: {
        type: parsed.type,
        startDate: new Date(parsed.startDate),
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        duration: parsed.duration ?? null,
        comments: parsed.comments ?? null,
      },
      files: files?.map((f) => ({
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        buffer: f.buffer,
      })),
    });

    res.status(201).json(absence);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: userId, role } = req.user!;
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const isAdmin = String(role).toUpperCase() === "ADMIN";
    const employeeId = isAdmin ? undefined : userId;

    const absences = await service.listAbsences({ companyId, type, status, employeeId });
    res.json(absences);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const absenceId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!absenceId) return res.status(400).json({ message: "id es requerido" });

    const absence = await service.getAbsenceById({ companyId, absenceId });
    res.json(absence);
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: reviewerId } = req.user!;
    const absenceId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!absenceId) return res.status(400).json({ message: "id es requerido" });

    const parsed = updateAbsenceStatusSchema.parse(req.body);
    const absence = await service.updateAbsenceStatus({
      companyId,
      absenceId,
      status: parsed.status,
      reviewerId,
    });
    res.json(absence);
  } catch (err) {
    next(err);
  }
}

export async function bulkUpdate(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: reviewerId } = req.user!;
    const parsed = bulkUpdateStatusSchema.parse(req.body);
    const result = await service.bulkUpdateStatus({
      companyId,
      ids: parsed.ids,
      status: parsed.status,
      reviewerId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: userId, role } = req.user!;
    const absenceId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!absenceId) return res.status(400).json({ message: "id es requerido" });

    await service.deleteAbsence({ companyId, absenceId, userId, role });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function listAttachments(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const absenceId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!absenceId) return res.status(400).json({ message: "id es requerido" });

    const attachments = await service.listAbsenceAttachments({ companyId, absenceId });
    res.json(attachments);
  } catch (err) {
    next(err);
  }
}

export async function downloadAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const attId = typeof req.params.attId === "string" ? req.params.attId : req.params.attId?.[0];
    if (!attId) return res.status(400).json({ message: "attId es requerido" });

    const file = await service.getAbsenceAttachmentData({ companyId, attachmentId: attId });

    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalName)}"`,
      "Content-Length": String(file.size),
      "Cache-Control": "private, max-age=86400",
    });

    res.send(file.data);
  } catch (err) {
    next(err);
  }
}
