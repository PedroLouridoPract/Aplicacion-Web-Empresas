import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function notFound(req: Request, res: Response) {
  res.status(404).json({ message: "Not found" });
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => i.message).filter((m) => m && m !== "Required");
    const message = details.length > 0
      ? `Error de validacion: ${details.join(". ")}`
      : "Hay campos obligatorios sin completar";
    res.status(400).json({ message, errors: err.issues });
    return;
  }

  const status = err?.statusCode ?? err?.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: err?.message ?? "Internal server error",
  });
}