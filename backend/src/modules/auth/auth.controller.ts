import { Request, Response } from "express";
import { registerCompanySchema, loginSchema } from "./auth.schemas";
import * as service from "./auth.service";

export async function registerCompany(req: Request, res: Response) {
  const parsed = registerCompanySchema.parse(req.body);
  const out = await service.registerCompany(parsed);
  res.status(201).json(out);
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.parse(req.body);
  const out = await service.login(parsed.email, parsed.password);
  res.json(out);
}

export async function me(req: Request, res: Response) {
  res.json({ user: req.user });
}