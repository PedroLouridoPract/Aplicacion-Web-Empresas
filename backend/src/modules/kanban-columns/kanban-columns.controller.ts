import { Request, Response, NextFunction } from "express";
import * as service from "./kanban-columns.service";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const projectId = typeof req.params.projectId === "string" ? req.params.projectId : req.params.projectId?.[0];
    if (!projectId) return res.status(400).json({ message: "projectId es requerido" });

    const columns = await service.listColumns({ projectId, companyId });
    res.json(columns);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const projectId = typeof req.params.projectId === "string" ? req.params.projectId : req.params.projectId?.[0];
    if (!projectId) return res.status(400).json({ message: "projectId es requerido" });

    const { label, color } = req.body;
    if (!label || typeof label !== "string" || !label.trim()) {
      return res.status(400).json({ message: "El nombre de la columna es obligatorio" });
    }

    const column = await service.createColumn({
      projectId,
      companyId,
      label: label.trim(),
      color: color || undefined,
    });
    res.status(201).json(column);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const columnId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!columnId) return res.status(400).json({ message: "id es requerido" });

    const { label, color } = req.body;
    const column = await service.updateColumn({
      columnId,
      companyId,
      label: label !== undefined ? String(label).trim() : undefined,
      color: color !== undefined ? color : undefined,
    });
    res.json(column);
  } catch (err) {
    next(err);
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const projectId = typeof req.params.projectId === "string" ? req.params.projectId : req.params.projectId?.[0];
    if (!projectId) return res.status(400).json({ message: "projectId es requerido" });

    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ message: "orderedIds debe ser un array no vacío" });
    }

    const columns = await service.reorderColumns({ projectId, companyId, orderedIds });
    res.json(columns);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const columnId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!columnId) return res.status(400).json({ message: "id es requerido" });

    await service.deleteColumn({ columnId, companyId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
