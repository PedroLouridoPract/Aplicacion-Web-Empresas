import { Request, Response } from "express";
import { moveTaskSchema } from "./tasks.schemas";
import * as service from "./tasks.service";

export async function move(req: Request, res: Response) {
  const { id: userId, companyId, role } = req.user!;
  const taskId = req.params.id;

  // Nota: aquí luego metes "member solo si owner" (owner check).
  // Por ahora: si está autenticado, deja mover (para MVP rápido).
  // Recomendado: implementar requireTaskOwnerOrAdmin.

  const parsed = moveTaskSchema.parse(req.body);
  const updated = await service.moveTask({
    taskId,
    companyId,
    status: parsed.status,
    orderIndex: parsed.orderIndex,
  });

  res.json({ task: updated });
}