import { prisma } from "../../db/prisma";
import { createNotification } from "../notifications/notifications.service";

const TYPE_LABELS: Record<string, string> = {
  BAJA_MEDICA: "Baja médica",
  HORAS_MEDICO: "Horas médico",
  VACACIONES: "Vacaciones",
  ASUNTOS_PROPIOS: "Asuntos propios",
  MATERNIDAD_PATERNIDAD: "Maternidad/Paternidad",
  FALLECIMIENTO: "Fallecimiento",
  MUDANZA: "Mudanza",
  OTRO: "Otro",
};

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const absenceSelect = {
  id: true,
  companyId: true,
  employeeId: true,
  employee: { select: { id: true, name: true, email: true, avatarUrl: true } },
  type: true,
  status: true,
  startDate: true,
  endDate: true,
  duration: true,
  comments: true,
  reviewerId: true,
  reviewer: { select: { id: true, name: true } },
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  attachments: {
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
};

export async function createAbsence(params: {
  companyId: string;
  employeeId: string;
  employeeName: string;
  data: {
    type: string;
    startDate: Date;
    endDate?: Date | null;
    duration?: string | null;
    comments?: string | null;
  };
  files?: { originalname: string; mimetype: string; size: number; buffer: Buffer }[];
}) {
  const absence = await prisma.absence.create({
    data: {
      companyId: params.companyId,
      employeeId: params.employeeId,
      type: params.data.type as any,
      startDate: params.data.startDate,
      endDate: params.data.endDate ?? null,
      duration: params.data.duration ?? null,
      comments: params.data.comments ?? null,
      ...(params.files && params.files.length > 0
        ? {
            attachments: {
              create: params.files.map((f) => ({
                originalName: f.originalname,
                mimeType: f.mimetype,
                size: f.size,
                data: Uint8Array.from(f.buffer) as any,
              })),
            },
          }
        : {}),
    },
    select: absenceSelect,
  });

  const admins = await prisma.user.findMany({
    where: { companyId: params.companyId, role: "ADMIN" },
    select: { id: true },
  });

  const typeLabel = TYPE_LABELS[params.data.type] || params.data.type;

  for (const admin of admins) {
    if (admin.id !== params.employeeId) {
      createNotification({
        userId: admin.id,
        message: `${params.employeeName} ha solicitado una ausencia: ${typeLabel}`,
        absenceId: absence.id,
        category: "absence_requests",
      }).catch(() => {});
    }
  }

  return absence;
}

export async function listAbsences(params: {
  companyId: string;
  type?: string;
  status?: string;
  employeeId?: string;
}) {
  const where: Record<string, unknown> = { companyId: params.companyId };
  if (params.type) where.type = params.type;
  if (params.status) where.status = params.status;
  if (params.employeeId) where.employeeId = params.employeeId;

  return prisma.absence.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: absenceSelect,
  });
}

export async function getAbsenceById(params: { companyId: string; absenceId: string }) {
  const absence = await prisma.absence.findFirst({
    where: { id: params.absenceId, companyId: params.companyId },
    select: absenceSelect,
  });
  if (!absence) {
    throw Object.assign(new Error("Ausencia no encontrada"), { statusCode: 404 });
  }
  return absence;
}

export async function updateAbsenceStatus(params: {
  companyId: string;
  absenceId: string;
  status: "APPROVED" | "REJECTED";
  reviewerId: string;
}) {
  const absence = await getAbsenceById({ companyId: params.companyId, absenceId: params.absenceId });

  const updated = await prisma.absence.update({
    where: { id: params.absenceId },
    data: {
      status: params.status,
      reviewerId: params.reviewerId,
      reviewedAt: new Date(),
    },
    select: absenceSelect,
  });

  const statusLabel = params.status === "APPROVED" ? "aprobada" : "rechazada";
  const absType = TYPE_LABELS[absence.type] || absence.type;
  const dateRange = absence.endDate && absence.endDate !== absence.startDate
    ? `${fmtDate(absence.startDate)} – ${fmtDate(absence.endDate)}`
    : fmtDate(absence.startDate);
  createNotification({
    userId: absence.employeeId,
    message: `Tu solicitud de ${absType} (${dateRange}) ha sido ${statusLabel}`,
    absenceId: params.absenceId,
    category: "absence_status",
  }).catch(() => {});

  return updated;
}

export async function bulkUpdateStatus(params: {
  companyId: string;
  ids: string[];
  status: "APPROVED" | "REJECTED";
  reviewerId: string;
}) {
  const absences = await prisma.absence.findMany({
    where: { id: { in: params.ids }, companyId: params.companyId },
    select: { id: true, employeeId: true, type: true, startDate: true, endDate: true },
  });

  await prisma.absence.updateMany({
    where: { id: { in: absences.map((a) => a.id) } },
    data: {
      status: params.status,
      reviewerId: params.reviewerId,
      reviewedAt: new Date(),
    },
  });

  const statusLabel = params.status === "APPROVED" ? "aprobada" : "rechazada";
  for (const a of absences) {
    const absType = TYPE_LABELS[a.type] || a.type;
    const dateRange = a.endDate && a.endDate.getTime() !== a.startDate.getTime()
      ? `${fmtDate(a.startDate)} – ${fmtDate(a.endDate)}`
      : fmtDate(a.startDate);
    createNotification({
      userId: a.employeeId,
      message: `Tu solicitud de ${absType} (${dateRange}) ha sido ${statusLabel}`,
      absenceId: a.id,
      category: "absence_status",
    }).catch(() => {});
  }

  return { updated: absences.length };
}

export async function deleteAbsence(params: {
  companyId: string;
  absenceId: string;
  userId: string;
  role: string;
}) {
  const absence = await getAbsenceById({ companyId: params.companyId, absenceId: params.absenceId });

  const isAdmin = params.role.toUpperCase() === "ADMIN";
  if (!isAdmin && absence.employeeId !== params.userId) {
    throw Object.assign(new Error("Solo puedes eliminar tus propias ausencias"), { statusCode: 403 });
  }

  if (!isAdmin && absence.status !== "PENDING") {
    throw Object.assign(new Error("Solo puedes eliminar ausencias pendientes"), { statusCode: 403 });
  }

  await prisma.absence.delete({ where: { id: params.absenceId } });
}

export async function listAbsenceAttachments(params: {
  companyId: string;
  absenceId: string;
}) {
  const absence = await prisma.absence.findFirst({
    where: { id: params.absenceId, companyId: params.companyId },
    select: { id: true },
  });
  if (!absence) {
    throw Object.assign(new Error("Ausencia no encontrada"), { statusCode: 404 });
  }

  return prisma.absenceAttachment.findMany({
    where: { absenceId: params.absenceId },
    select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getAbsenceAttachmentData(params: {
  companyId: string;
  attachmentId: string;
}) {
  const attachment = await prisma.absenceAttachment.findUnique({
    where: { id: params.attachmentId },
    include: { absence: { select: { companyId: true } } },
  });

  if (!attachment || attachment.absence.companyId !== params.companyId) {
    throw Object.assign(new Error("Adjunto no encontrado"), { statusCode: 404 });
  }

  return {
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    data: attachment.data,
  };
}
