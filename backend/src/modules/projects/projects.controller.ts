import { Request, Response } from "express";
import * as service from "./projects.service";
import { createProjectSchema, updateProjectSchema } from "./projects.schemas";

export async function list(req: Request, res: Response) {
  const { companyId } = req.user!;
  const projects = await service.listProjects({ companyId });
  res.json({ projects });
}

export async function create(req: Request, res: Response) {
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
}

export async function getById(req: Request, res: Response) {
  const { companyId } = req.user!;
  const projectId = req.params.id;

  const project = await service.getProjectById({ companyId, projectId });
  res.json({ project });
}

export async function update(req: Request, res: Response) {
  const { companyId } = req.user!;
  const projectId = req.params.id;

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
}

export async function remove(req: Request, res: Response) {
  const { companyId } = req.user!;
  const projectId = req.params.id;

  await service.deleteProject({ companyId, projectId });
  res.status(204).send();
}