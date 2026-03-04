import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import multer from "multer";

export function notFound(req: Request, res: Response) {
  res.status(404).json({ message: "Not found" });
}

const MULTER_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: "El archivo excede el tamaño máximo permitido (10 MB).",
  LIMIT_FILE_COUNT: "Se ha excedido el número máximo de archivos permitidos.",
  LIMIT_UNEXPECTED_FILE: "Se han enviado más archivos de los permitidos. El límite es de 10 archivos.",
  LIMIT_PART_COUNT: "Demasiados campos en el formulario.",
  LIMIT_FIELD_KEY: "El nombre de un campo es demasiado largo.",
  LIMIT_FIELD_VALUE: "El valor de un campo es demasiado largo.",
  LIMIT_FIELD_COUNT: "Demasiados campos de texto.",
};

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof multer.MulterError) {
    const message = MULTER_MESSAGES[err.code] || `Error al subir archivo: ${err.message}`;
    res.status(400).json({ message });
    return;
  }

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