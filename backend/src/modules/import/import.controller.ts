import { Request, Response, NextFunction } from "express";
import { parseCsv, importTasksFromCsv, extractProjects } from "./import.service";

export async function importTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;

    if (!req.file) {
      return res.status(400).json({ message: "Se requiere un archivo CSV" });
    }

    const rows = parseCsv(req.file.buffer);

    if (rows.length === 0) {
      return res.status(400).json({ message: "El archivo CSV está vacío o no tiene filas válidas" });
    }

    const result = await importTasksFromCsv({ companyId, rows });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function previewCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Se requiere un archivo CSV" });
    }

    const rows = parseCsv(req.file.buffer);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const preview = rows.slice(0, 10);
    const projects = extractProjects(rows);

    res.json({ columns, totalRows: rows.length, preview, projects });
  } catch (err) {
    next(err);
  }
}
