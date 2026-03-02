import { Request, Response } from "express";
import * as service from "./comments.service";
import { createCommentSchema } from "./comments.schemas";

export async function listByTask(req: Request, res: Response) {
  const { companyId } = req.user!;
  const taskId = req.params.taskId;

  const comments = await service.listByTask({ companyId, taskId });
  res.json({ comments });
}

export async function create(req: Request, res: Response) {
  const { companyId, id: userId, role } = req.user!;

  const parsed = createCommentSchema.parse(req.body);

  const comment = await service.create({
    companyId,
    userId,
    role,
    taskId: parsed.taskId,
    body: parsed.body,
  });

  res.status(201).json({ comment });
}