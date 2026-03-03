import { prisma } from "../../db/prisma";

const attachmentListSelect = {
  id: true,
  originalName: true,
  mimeType: true,
  size: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true } },
};

export async function createManyAttachments(params: {
  taskId: string;
  companyId: string;
  uploadedById: string;
  files: Array<{ originalname: string; mimetype: string; size: number; buffer: Buffer }>;
}) {
  const task = await prisma.task.findFirst({
    where: { id: params.taskId, companyId: params.companyId },
    select: { id: true },
  });
  if (!task) throw Object.assign(new Error("La tarea no existe o no pertenece a tu empresa"), { statusCode: 404 });

  const created = [];
  for (const f of params.files) {
    const att = await prisma.attachment.create({
      data: {
        taskId: params.taskId,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        data: f.buffer,
        uploadedById: params.uploadedById,
      },
      select: attachmentListSelect,
    });
    created.push(att);
  }

  return created;
}

export async function listAttachments(params: { taskId: string; companyId: string }) {
  const task = await prisma.task.findFirst({
    where: { id: params.taskId, companyId: params.companyId },
    select: { id: true },
  });
  if (!task) throw Object.assign(new Error("La tarea no existe o no pertenece a tu empresa"), { statusCode: 404 });

  return prisma.attachment.findMany({
    where: { taskId: params.taskId },
    orderBy: { createdAt: "desc" },
    select: attachmentListSelect,
  });
}

export async function getAttachmentData(params: { attachmentId: string; companyId: string }) {
  const attachment = await prisma.attachment.findFirst({
    where: { id: params.attachmentId },
    include: { task: { select: { companyId: true } } },
  });

  if (!attachment || attachment.task.companyId !== params.companyId) {
    throw Object.assign(new Error("Adjunto no encontrado"), { statusCode: 404 });
  }

  return {
    data: attachment.data,
    mimeType: attachment.mimeType,
    originalName: attachment.originalName,
    size: attachment.size,
  };
}

export async function deleteAttachment(params: {
  attachmentId: string;
  companyId: string;
  userId: string;
  role: string;
}) {
  const attachment = await prisma.attachment.findFirst({
    where: { id: params.attachmentId },
    include: { task: { select: { companyId: true } } },
  });

  if (!attachment || attachment.task.companyId !== params.companyId) {
    throw Object.assign(new Error("Adjunto no encontrado"), { statusCode: 404 });
  }

  const isAdmin = params.role.toUpperCase() === "ADMIN";
  if (!isAdmin && attachment.uploadedById !== params.userId) {
    throw Object.assign(new Error("Solo puedes eliminar tus propios adjuntos"), { statusCode: 403 });
  }

  await prisma.attachment.delete({ where: { id: params.attachmentId } });
}
