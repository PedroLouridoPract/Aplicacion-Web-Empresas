import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(2, "El nombre del proyecto debe tener al menos 2 caracteres"),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
}).refine(
  (d) => {
    if (d.startDate && d.endDate) {
      return new Date(d.endDate) >= new Date(d.startDate);
    }
    return true;
  },
  { message: "La fecha de fin no puede ser anterior a la fecha de inicio", path: ["endDate"] },
);

export const updateProjectSchema = z.object({
  name: z.string().min(2, "El nombre del proyecto debe tener al menos 2 caracteres").optional(),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
}).refine(
  (d) => {
    if (d.startDate && d.endDate) {
      return new Date(d.endDate) >= new Date(d.startDate);
    }
    return true;
  },
  { message: "La fecha de fin no puede ser anterior a la fecha de inicio", path: ["endDate"] },
);
