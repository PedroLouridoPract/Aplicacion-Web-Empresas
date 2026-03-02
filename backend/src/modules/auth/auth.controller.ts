import { Request, Response, NextFunction } from "express";
import { registerCompanySchema, loginSchema } from "./auth.schemas";
import * as service from "./auth.service";

export async function registerCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = registerCompanySchema.parse(req.body);
    const out = await service.registerCompany(parsed);
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.parse(req.body);
    const out = await service.login(parsed.email, parsed.password);
    res.json(out);
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.getMe(req.user!.id);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
