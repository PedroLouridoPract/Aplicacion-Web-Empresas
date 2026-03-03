import { Request, Response, NextFunction } from "express";
import * as service from "./attachments.service";

export async function upload(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: userId } = req.user!;
    const taskId = req.params.taskId;
    if (!taskId) return res.status(400).json({ message: "taskId es requerido" });

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No se enviaron archivos" });
    }

    const attachments = await service.createManyAttachments({
      taskId,
      companyId,
      uploadedById: userId,
      files: files.map((f) => ({
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        buffer: f.buffer,
      })),
    });

    res.status(201).json(attachments);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const taskId = req.params.taskId;
    if (!taskId) return res.status(400).json({ message: "taskId es requerido" });

    const attachments = await service.listAttachments({ taskId, companyId });
    res.json(attachments);
  } catch (err) {
    next(err);
  }
}

export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const attachmentId = req.params.id;
    if (!attachmentId) return res.status(400).json({ message: "id es requerido" });

    const file = await service.getAttachmentData({ attachmentId, companyId });

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

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: userId, role } = req.user!;
    const attachmentId = req.params.id;
    if (!attachmentId) return res.status(400).json({ message: "id es requerido" });

    await service.deleteAttachment({ attachmentId, companyId, userId, role });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
