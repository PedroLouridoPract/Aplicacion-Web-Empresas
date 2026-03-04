import { z } from "zod";

export const createCommentSchema = z.object({
  taskId: z.string().min(1),
  body: z.string().min(1).max(5000),
  attachments: z.string().optional(),
  mentionedUserIds: z.array(z.string()).optional(),
  parentId: z.string().optional(),
});

export const toggleReactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});