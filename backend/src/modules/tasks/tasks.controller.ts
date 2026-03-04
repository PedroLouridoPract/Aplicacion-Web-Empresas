import { Request, Response, NextFunction } from "express";
import { moveTaskSchema, createTaskSchema, updateTaskSchema, assertFutureDate } from "./tasks.schemas";
import * as service from "./tasks.service";
import { createNotification } from "../notifications/notifications.service";

function canEditTask(task: { assigneeId: string | null }, userId: string, role: string) {
  const r = String(role).toUpperCase();
  return r === "ADMIN" || r === "MEMBER";
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, role } = req.user!;
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const assigneeId = typeof req.query.assigneeId === "string" ? req.query.assigneeId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const tasks = await service.listTasks({ companyId, projectId, assigneeId, status });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
}

export async function mine(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: userId } = req.user!;
    const tasks = await service.listTasksAssignedToMe({ companyId, userId });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const taskId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!taskId) return res.status(400).json({ message: "Invalid task id" });
    const task = await service.getTaskById({ companyId, taskId });
    res.json(task);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: userId, role } = req.user!;
    const parsed = createTaskSchema.parse(req.body);
    assertFutureDate(parsed.dueDate, "fecha limite");

    if (String(role).toUpperCase() === "MEMBER" && parsed.assigneeId && parsed.assigneeId !== userId) {
      return res.status(403).json({ message: "Solo puedes asignarte tareas a ti mismo" });
    }

    const dueDate = parsed.dueDate ? new Date(parsed.dueDate) : null;
    const task = await service.createTask({
      companyId,
      data: {
        projectId: parsed.projectId,
        title: parsed.title,
        description: parsed.description ?? null,
        assigneeId: parsed.assigneeId ?? null,
        dueDate,
        priority: parsed.priority as "HIGH" | "MEDIUM" | "LOW",
        status: parsed.status as "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE",
        customStatus: parsed.customStatus ?? null,
        progress: parsed.progress,
      },
    });

    if (parsed.assigneeId && parsed.assigneeId !== userId) {
      createNotification({
        userId: parsed.assigneeId,
        message: `Te han asignado la tarea "${parsed.title}"`,
        taskId: task.id,
      }).catch(() => {});
    }

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

export async function move(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: userId, role } = req.user!;
    const taskId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!taskId) return res.status(400).json({ message: "Invalid task id" });

    const task = await service.getTaskById({ companyId, taskId });
    if (!canEditTask(task, userId, role)) {
      return res.status(403).json({ message: "Solo el responsable de la tarea o un administrador pueden moverla" });
    }

    const parsed = moveTaskSchema.parse(req.body);
    const updated = await service.moveTask({
      taskId,
      companyId,
      status: parsed.status,
      customStatus: parsed.customStatus,
      columnKey: parsed.columnKey,
      orderIndex: parsed.orderIndex,
    });
    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: userId, role } = req.user!;
    const taskId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!taskId) return res.status(400).json({ message: "Invalid task id" });

    const existing = await service.getTaskById({ companyId, taskId });
    if (!canEditTask(existing, userId, role)) {
      return res.status(403).json({ message: "Solo el responsable de la tarea o un administrador pueden editarla" });
    }

    if (service.isTaskLockedByOther(existing, userId)) {
      const lockerName = (existing as any).lockedBy?.name || "otro usuario";
      return res.status(423).json({ message: `Esta tarea está siendo editada por ${lockerName}. Inténtalo más tarde.` });
    }

    const parsed = updateTaskSchema.parse(req.body);
    const isMember = String(role).toUpperCase() === "MEMBER";

    if (isMember && parsed.assigneeId !== undefined && parsed.assigneeId !== null && parsed.assigneeId !== userId) {
      return res.status(403).json({ message: "Solo puedes asignar tareas a ti mismo" });
    }

    let data: Record<string, unknown>;

    if (isMember) {
      const isAssignee = existing.assigneeId === userId;
      data = {
        ...(parsed.assigneeId !== undefined && { assigneeId: parsed.assigneeId }),
        ...(isAssignee && parsed.status != null && { status: parsed.status }),
        ...(isAssignee && parsed.customStatus !== undefined && { customStatus: parsed.customStatus }),
        ...(isAssignee && parsed.progress != null && { progress: parsed.progress }),
      };
    } else {
      if (parsed.dueDate) assertFutureDate(parsed.dueDate, "fecha limite");
      const dueDate = parsed.dueDate !== undefined ? (parsed.dueDate ? new Date(parsed.dueDate) : null) : undefined;
      data = {
        ...(parsed.title != null && { title: parsed.title }),
        ...(parsed.description !== undefined && { description: parsed.description }),
        ...(parsed.assigneeId !== undefined && { assigneeId: parsed.assigneeId }),
        ...(dueDate !== undefined && { dueDate }),
        ...(parsed.priority != null && { priority: parsed.priority }),
        ...(parsed.status != null && { status: parsed.status }),
        ...(parsed.customStatus !== undefined && { customStatus: parsed.customStatus }),
        ...(parsed.progress != null && { progress: parsed.progress }),
        ...(parsed.orderIndex != null && { orderIndex: parsed.orderIndex }),
      };
    }

    const task = await service.updateTask({
      companyId,
      taskId,
      data,
    });

    const newAssignee = data.assigneeId as string | undefined | null;
    if (newAssignee && newAssignee !== existing.assigneeId && newAssignee !== userId) {
      createNotification({
        userId: newAssignee,
        message: `Te han asignado la tarea "${existing.title}"`,
        taskId,
      }).catch(() => {});
    }

    if (newAssignee && newAssignee !== existing.assigneeId && newAssignee === userId) {
      createNotification({
        userId: newAssignee,
        message: `Te has asignado la tarea "${existing.title}"`,
        taskId,
      }).catch(() => {});
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
}

export async function lock(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: userId } = req.user!;
    const taskId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!taskId) return res.status(400).json({ message: "Invalid task id" });

    const task = await service.lockTask({ companyId, taskId, userId });
    res.json(task);
  } catch (err) {
    next(err);
  }
}

export async function unlock(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, id: userId } = req.user!;
    const taskId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!taskId) return res.status(400).json({ message: "Invalid task id" });

    const task = await service.unlockTask({ companyId, taskId, userId });
    res.json(task);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, role } = req.user!;
    const taskId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!taskId) return res.status(400).json({ message: "Invalid task id" });

    if (String(role).toUpperCase() !== "ADMIN") {
      return res.status(403).json({ message: "Solo los administradores pueden eliminar tareas" });
    }

    await service.deleteTask({ companyId, taskId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
