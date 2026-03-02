import { z } from "zod";

export const moveTaskSchema = z.object({
  status: z.enum(["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"]),
  orderIndex: z.number().int().min(0),
});