import { z } from "zod";

const taskStatusEnum = z.enum(["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE", "backlog", "in_progress", "review", "done"]);

export const moveTaskSchema = z.object({
  status: taskStatusEnum.optional(),
  customStatus: z.string().optional().nullable(),
  columnKey: z.string().optional(),
  orderIndex: z.number().int().min(0).optional(),
  order_index: z.number().int().min(0).optional(),
}).transform((d) => ({
  status: d.status ? (d.status.toUpperCase().replace("-", "_") as "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE") : undefined,
  customStatus: d.customStatus ?? null,
  columnKey: d.columnKey,
  orderIndex: d.orderIndex ?? d.order_index ?? 0,
}));

const dateString = z.union([
  z.string().datetime(),
  z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  z.string().length(10),
]);

function assertFutureDate(val: string | null | undefined, fieldName: string) {
  if (!val) return;
  const d = new Date(val);
  if (isNaN(d.getTime())) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) {
    throw Object.assign(
      new Error(`La ${fieldName} no puede ser anterior a hoy (${today.toLocaleDateString("es-ES")})`),
      { statusCode: 400 },
    );
  }
}

export const createTaskSchema = z.object({
  projectId: z.string().min(1, "El ID del proyecto es obligatorio"),
  title: z.string().min(1, "El titulo de la tarea es obligatorio"),
  description: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  dueDate: dateString.optional().nullable(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional().default("MEDIUM"),
  status: z.enum(["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"]).optional().default("BACKLOG"),
  customStatus: z.string().optional().nullable(),
  progress: z.number().int().min(0, "El progreso minimo es 0").max(100, "El progreso maximo es 100").optional().default(0),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, "El titulo no puede estar vacio").optional(),
  description: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  dueDate: dateString.optional().nullable(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  status: z.enum(["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  customStatus: z.string().optional().nullable(),
  progress: z.number().int().min(0, "El progreso minimo es 0").max(100, "El progreso maximo es 100").optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export { assertFutureDate };
