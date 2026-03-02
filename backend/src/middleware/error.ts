import { Request, Response, NextFunction } from "express";

export function notFound(req: Request, res: Response) {
  res.status(404).json({ message: "Not found" });
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(err?.statusCode ?? 500).json({
    message: err?.message ?? "Internal server error",
  });
}