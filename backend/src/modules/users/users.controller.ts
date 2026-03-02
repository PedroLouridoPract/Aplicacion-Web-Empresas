import { Request, Response, NextFunction } from "express";
import * as service from "./users.service";
import { createUserSchema, updateUserSchema } from "./users.schemas";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const users = await service.listUsersByCompany(companyId);
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const parsed = createUserSchema.parse(req.body);
    const role = String(parsed.role ?? "MEMBER").toUpperCase() as "ADMIN" | "MEMBER" | "GUEST";
    const user = await service.createUser({
      companyId,
      data: {
        name: parsed.name,
        email: parsed.email,
        password: parsed.password,
        role: role === "ADMIN" || role === "MEMBER" || role === "GUEST" ? role : "MEMBER",
      },
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const userId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!userId) return res.status(400).json({ message: "Invalid user id" });

    const parsed = updateUserSchema.parse(req.body);
    const role = parsed.role != null ? (String(parsed.role).toUpperCase() as "ADMIN" | "MEMBER" | "GUEST") : undefined;
    const user = await service.updateUser({
      companyId,
      userId,
      data: {
        ...(role != null && { role }),
        ...(parsed.name != null && { name: parsed.name }),
      },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
}
