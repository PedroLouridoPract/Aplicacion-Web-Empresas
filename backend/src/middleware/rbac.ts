import { Request, Response, NextFunction } from "express";

export function requireRole(roles: Array<"ADMIN" | "MEMBER" | "GUEST">) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireRole(["ADMIN"])(req, res, next);
}