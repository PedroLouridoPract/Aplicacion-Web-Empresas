import { z } from "zod";

export const createCommentSchema = z.object({
  taskId: z.string().min(1),
  body: z.string().min(1).max(5000),
});