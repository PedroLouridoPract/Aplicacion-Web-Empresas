import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MEMBER", "GUEST", "admin", "member", "guest"]).optional().default("MEMBER"),
});

export const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER", "GUEST", "admin", "member", "guest"]).optional(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});
