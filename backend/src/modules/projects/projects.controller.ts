import { Request, Response, NextFunction } from "express";
import * as service from "./projects.service";
import { createProjectSchema, updateProjectSchema } from "./projects.schemas";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const projects = await service.listProjects({ companyId });
    res.json({ projects });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const parsed = createProjectSchema.parse(req.body);

    const project = await service.createProject({
      companyId,
      data: {
        ...parsed,
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      },
    });

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const projectId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!projectId) return res.status(400).json({ message: "Invalid project id" });

    const project = await service.getProjectById({ companyId, projectId });
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const projectId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!projectId) return res.status(400).json({ message: "Invalid project id" });

    const parsed = updateProjectSchema.parse(req.body);

    const project = await service.updateProject({
      companyId,
      projectId,
      data: {
        ...parsed,
        startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
        endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
      },
    });

    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const projectId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!projectId) return res.status(400).json({ message: "Invalid project id" });

    await service.deleteProject({ companyId, projectId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function toTaskResponse(task: { status: string; orderIndex: number; [k: string]: unknown }) {
  return {
    ...task,
    status: (task.status ?? "").toLowerCase(),
    order_index: task.orderIndex,
  };
}

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const projectId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!projectId) return res.status(400).json({ message: "Invalid project id" });
    const tasks = await service.listTasksByProject({ companyId, projectId });
    res.json(tasks.map(toTaskResponse));
  } catch (err) {
    next(err);
  }
}

export async function executive(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.user!;
    const projectId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!projectId) return res.status(400).json({ message: "Invalid project id" });
    const data = await service.getExecutiveView({ companyId, projectId });
    const mapTask = (t: Record<string, unknown> & { status?: string; orderIndex?: number; priority?: string; dueDate?: unknown; assigneeId?: unknown }) => ({
      ...t,
      status: String(t.status ?? "").toLowerCase(),
      priority: String(t.priority ?? "").toLowerCase(),
      order_index: t.orderIndex,
      due_date: t.dueDate,
      assignee_id: t.assigneeId,
    });
    res.json({
      overdue: data.overdue.map(mapTask),
      this_week: data.this_week.map(mapTask),
      next_week: data.next_week.map(mapTask),
    });
  } catch (err) {
    next(err);
  }
}
