import { z } from "zod";

const dateString = z.union([
  z.string().datetime(),
  z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  z.string().length(10),
]);

export const absenceTypeEnum = z.enum([
  "BAJA_MEDICA",
  "HORAS_MEDICO",
  "VACACIONES",
  "ASUNTOS_PROPIOS",
  "MATERNIDAD_PATERNIDAD",
  "FALLECIMIENTO",
  "MUDANZA",
  "OTRO",
]);

export const absenceStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const createAbsenceSchema = z.object({
  type: absenceTypeEnum,
  startDate: dateString,
  endDate: dateString.optional().nullable(),
  duration: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
});

export const updateAbsenceStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const bulkUpdateStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
});
