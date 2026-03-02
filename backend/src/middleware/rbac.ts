import { Request, Response, NextFunction } from "express";

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  MEMBER: "Miembro",
  GUEST: "Invitado",
};

export function requireRole(roles: Array<"ADMIN" | "MEMBER" | "GUEST">, context?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const raw = req.user?.role;
    if (!raw) return res.status(401).json({ message: "No has iniciado sesion" });
    const role = String(raw).toUpperCase() as "ADMIN" | "MEMBER" | "GUEST";
    if (!roles.includes(role)) {
      const allowed = roles.map((r) => roleLabels[r] || r).join(" o ");
      const current = roleLabels[role] || role;
      const action = context || "realizar esta accion";
      return res.status(403).json({
        message: `No tienes permisos para ${action}. Tu rol es ${current}, se requiere ${allowed}.`,
      });
    }
    next();
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireRole(["ADMIN"], "realizar esta accion (solo administradores)")(req, res, next);
}
