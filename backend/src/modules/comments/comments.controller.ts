import { Request, Response, NextFunction } from "express";
import * as service from "./comments.service";
import { createCommentSchema } from "./comments.schemas";

export async function listByTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const taskId = typeof req.params.taskId === "string" ? req.params.taskId : req.params.taskId?.[0];
    if (!taskId) return res.status(400).json({ message: "Invalid taskId" });

    const comments = await service.listByTask({ companyId, taskId });
    res.json({ comments });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: userId } = req.user!;
    const parsed = createCommentSchema.parse(req.body);

    const comment = await service.create({
      companyId,
      userId,
      taskId: parsed.taskId,
      body: parsed.body,
    });

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: userId, role } = req.user!;
    const commentId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!commentId) return res.status(400).json({ message: "Invalid comment id" });

    await service.remove({ companyId, userId, role, commentId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
