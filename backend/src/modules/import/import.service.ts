import { parse } from "csv-parse/sync";
import { prisma } from "../../db/prisma";

export type CsvRow = Record<string, string>;

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  projectsCreated: string[];
  usersCreated: string[];
  commentsImported: number;
  errors: { row: number; message: string }[];
}

const PRIORITY_MAP: Record<string, "HIGH" | "MEDIUM" | "LOW"> = {
  HIGHEST: "HIGH",
  HIGH: "HIGH",
  ALTA: "HIGH",
  "PRIORIDAD ALTA": "HIGH",
  MEDIUM: "MEDIUM",
  MEDIA: "MEDIUM",
  "PRIORIDAD MEDIA": "MEDIUM",
  LOW: "LOW",
  BAJA: "LOW",
  "PRIORIDAD BAJA": "LOW",
  LOWEST: "LOW",
};

const STATUS_CATEGORY_MAP: Record<string, "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE"> = {
  "POR HACER": "BACKLOG",
  "TO DO": "BACKLOG",
  "EN CURSO": "IN_PROGRESS",
  "IN PROGRESS": "IN_PROGRESS",
  LISTO: "DONE",
  DONE: "DONE",
};

const STATUS_MAP: Record<string, "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE"> = {
  BACKLOG: "BACKLOG",
  PENDIENTE: "BACKLOG",
  "TICKETS PENDIENTES": "BACKLOG",
  "TO DO": "BACKLOG",
  "POR HACER": "BACKLOG",
  IN_PROGRESS: "IN_PROGRESS",
  "IN PROGRESS": "IN_PROGRESS",
  "EN PROGRESO": "IN_PROGRESS",
  "EN CURSO": "IN_PROGRESS",
  REVIEW: "REVIEW",
  "REVISIÓN": "REVIEW",
  REVISION: "REVIEW",
  "POR REVISAR EN PRO": "REVIEW",
  "PENDIENTE DE SUBIR A PRO": "REVIEW",
  "PRIORIDAD ALTA": "IN_PROGRESS",
  "PRIORIDAD MEDIA": "BACKLOG",
  DONE: "DONE",
  COMPLETADO: "DONE",
  COMPLETADA: "DONE",
  HECHO: "DONE",
  LISTO: "DONE",
  "✅TICKETS SOLUCIONADOS": "DONE",
};

function normalise(value: string | undefined): string {
  return (value ?? "").trim();
}

function findColumn(row: CsvRow, candidates: string[]): string {
  for (const c of candidates) {
    const key = Object.keys(row).find((k) => k.trim().toLowerCase() === c.toLowerCase());
    if (key !== undefined && normalise(row[key])) return normalise(row[key]);
  }
  return "";
}

function findAllColumns(row: CsvRow, name: string): string[] {
  const values: string[] = [];
  for (const key of Object.keys(row)) {
    if (key.trim().toLowerCase() === name.toLowerCase() && normalise(row[key])) {
      values.push(normalise(row[key]));
    }
  }
  return values;
}

const MONTH_MAP: Record<string, string> = {
  ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06",
  jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12",
  jan: "01", apr: "04", aug: "08", dec: "12",
};

function parseJiraDate(raw: string): Date | null {
  if (!raw) return null;

  const jiraMatch = raw.match(
    /^(\d{1,2})\/(\w{3})\/(\d{2,4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i,
  );
  if (jiraMatch) {
    const [, day, monthStr, yearStr, hourStr, min, ampm] = jiraMatch;
    const month = MONTH_MAP[monthStr.toLowerCase()];
    if (!month) return null;

    let year = parseInt(yearStr, 10);
    if (year < 100) year += 2000;

    let hour = parseInt(hourStr, 10);
    if (ampm) {
      const upper = ampm.toUpperCase();
      if (upper === "PM" && hour < 12) hour += 12;
      if (upper === "AM" && hour === 12) hour = 0;
    }

    const iso = `${year}-${month}-${day.padStart(2, "0")}T${String(hour).padStart(2, "0")}:${min}:00`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

interface ParsedComment {
  date: Date | null;
  authorName: string;
  body: string;
}

function parseJiraComments(row: CsvRow, jiraIdToName: Map<string, string>): ParsedComment[] {
  const rawComments = [
    ...findAllColumns(row, "Comentario"),
    ...findAllColumns(row, "Comment"),
  ];

  const comments: ParsedComment[] = [];

  for (const raw of rawComments) {
    if (!raw) continue;

    // Jira format: "02/mar/26 4:32 PM;jiraUserId;body"
    const parts = raw.split(";");
    if (parts.length >= 3) {
      const dateStr = parts[0].trim();
      const jiraId = parts[1].trim();
      const body = parts.slice(2).join(";").trim();

      if (body) {
        const date = parseJiraDate(dateStr);
        const authorName = jiraIdToName.get(jiraId) || jiraId;
        comments.push({ date, authorName, body });
      }
    } else if (raw.trim()) {
      comments.push({ date: null, authorName: "", body: raw.trim() });
    }
  }

  return comments;
}

export function parseCsv(buffer: Buffer): CsvRow[] {
  return parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as CsvRow[];
}

export function extractProjects(rows: CsvRow[]): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    const name = findColumn(row, [
      "Nombre del proyecto", "Project name", "Project Name",
      "proyecto", "project",
    ]);
    if (name) names.add(name);
  }
  return [...names];
}

function buildJiraIdToNameMap(rows: CsvRow[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const row of rows) {
    const pairs: [string, string][] = [
      ["ID del creador", "Creador"],
      ["ID del informador", "Informador"],
      ["ID de la persona asignada", "Persona asignada"],
      ["ID del responsable del proyecto", "Responsable del proyecto"],
    ];
    for (const [idCol, nameCol] of pairs) {
      const id = findColumn(row, [idCol]);
      const name = findColumn(row, [nameCol]);
      if (id && name) map.set(id, name);
    }
  }

  return map;
}

async function resolveProjectId(
  companyId: string,
  projectName: string,
  leadName: string,
  projectCache: Map<string, string>,
  createdProjects: Set<string>,
): Promise<string> {
  const cacheKey = projectName.toLowerCase();
  const cached = projectCache.get(cacheKey);
  if (cached) return cached;

  const existing = await prisma.project.findFirst({
    where: { companyId, name: { equals: projectName, mode: "insensitive" } },
    select: { id: true },
  });

  if (existing) {
    if (leadName) {
      await prisma.project.update({
        where: { id: existing.id },
        data: { leadName },
      });
    }
    projectCache.set(cacheKey, existing.id);
    return existing.id;
  }

  const created = await prisma.project.create({
    data: { companyId, name: projectName, status: "ACTIVE", leadName: leadName || null },
    select: { id: true },
  });

  projectCache.set(cacheKey, created.id);
  createdProjects.add(projectName);
  return created.id;
}

async function resolveOrCreateUser(
  companyId: string,
  name: string,
  userCache: Map<string, string>,
  createdUsers: Set<string>,
): Promise<string> {
  const cacheKey = name.toLowerCase();
  const cached = userCache.get(cacheKey);
  if (cached) return cached;

  const existing = await prisma.user.findFirst({
    where: { companyId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });

  if (existing) {
    userCache.set(cacheKey, existing.id);
    return existing.id;
  }

  const created = await prisma.user.create({
    data: {
      companyId,
      name,
      email: null,
      passwordHash: "",
      role: "MEMBER",
    },
    select: { id: true },
  });

  userCache.set(cacheKey, created.id);
  createdUsers.add(name);
  return created.id;
}

export async function importTasksFromCsv(params: {
  companyId: string;
  rows: CsvRow[];
}): Promise<ImportResult> {
  const { companyId, rows } = params;

  const jiraIdToName = buildJiraIdToNameMap(rows);
  const projectCache = new Map<string, string>();
  const userCache = new Map<string, string>();
  const createdProjects = new Set<string>();
  const createdUsers = new Set<string>();

  const result: ImportResult = {
    total: rows.length,
    created: 0,
    updated: 0,
    projectsCreated: [],
    usersCreated: [],
    commentsImported: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const projectName = findColumn(row, [
        "Nombre del proyecto", "Project name", "Project Name",
        "proyecto", "project",
      ]);
      if (!projectName) {
        result.errors.push({ row: rowNum, message: "Falta el nombre del proyecto" });
        continue;
      }

      // Title = Clave de incidencia + ID de la incidencia + Tipo de incidencia
      const issueKey = findColumn(row, ["Clave de incidencia", "Issue key", "Key"]);
      const issueId = findColumn(row, ["ID de la incidencia", "Issue id", "Issue ID"]);
      const issueType = findColumn(row, ["Tipo de Incidencia", "Issue Type", "Issue type"]);

      let title = [issueKey, issueId, issueType].filter(Boolean).join(" · ");
      if (!title) {
        title = findColumn(row, [
          "Resumen", "Summary", "title", "titulo", "título", "nombre", "tarea", "task",
        ]);
      }
      if (!title) {
        result.errors.push({ row: rowNum, message: "Falta la clave/ID/tipo de incidencia o un título" });
        continue;
      }

      // Summary = "Resumen" field
      const summary = findColumn(row, ["Resumen", "Summary"]) || null;

      // Description = "Descripción" field
      const description = findColumn(row, [
        "Descripción", "Description", "description", "descripcion", "detalle",
      ]) || null;

      const priorityRaw = findColumn(row, ["Prioridad", "Priority"]).toUpperCase();
      const priority = PRIORITY_MAP[priorityRaw] ?? "MEDIUM";

      const statusCategoryRaw = findColumn(row, [
        "Categoría de estado", "Status Category",
      ]).toUpperCase();
      const statusRaw = findColumn(row, [
        "Estado", "Status", "status", "estado",
      ]).toUpperCase();
      const status =
        STATUS_CATEGORY_MAP[statusCategoryRaw] ??
        STATUS_MAP[statusRaw] ??
        "BACKLOG";

      // Responsable del proyecto → leadName on project & assignee
      const leadName = findColumn(row, [
        "Responsable del proyecto", "Project lead", "Project Lead",
      ]);

      const projectId = await resolveProjectId(companyId, projectName, leadName, projectCache, createdProjects);

      // Persona asignada → create user without email if not found
      const assigneeRaw = findColumn(row, [
        "Persona asignada", "Assignee",
        "assignee", "asignado", "responsable",
      ]);
      let assigneeId: string | null = null;
      if (assigneeRaw) {
        assigneeId = await resolveOrCreateUser(companyId, assigneeRaw, userCache, createdUsers);
      }

      // Creator and reporter names
      const creatorName = findColumn(row, ["Creador", "Creator"]) || null;
      const reporterName = findColumn(row, ["Informador", "Reporter"]) || null;

      const dueDateRaw = findColumn(row, [
        "Fecha de vencimiento", "Due date", "Due Date",
        "duedate", "due_date", "fecha_limite", "fecha_vencimiento",
      ]);
      const dueDate = parseJiraDate(dueDateRaw);

      const progressRaw = findColumn(row, ["progress", "progreso", "avance"]);
      let progress = 0;
      if (progressRaw) {
        const num = parseInt(progressRaw, 10);
        if (!isNaN(num) && num >= 0 && num <= 100) progress = num;
      }
      if (status === "DONE") progress = 100;

      // Created date from CSV
      const createdRaw = findColumn(row, [
        "Creada", "Created", "created", "creada", "Fecha de creación",
      ]);
      const createdAt = parseJiraDate(createdRaw) ?? new Date();

      // Resolved date from CSV
      const resolvedRaw = findColumn(row, [
        "Resuelta", "Resolved", "resolved", "resuelta", "Fecha de resolución",
      ]);
      const resolvedAt = parseJiraDate(resolvedRaw);

      // Check if task already exists (same title in same project)
      const existing = await prisma.task.findFirst({
        where: { companyId, projectId, title },
        select: { id: true },
      });

      let taskId: string;

      if (existing) {
        await prisma.task.update({
          where: { id: existing.id },
          data: {
            summary,
            description,
            assigneeId,
            creatorName,
            reporterName,
            dueDate,
            priority,
            status,
            progress,
            createdAt,
            resolvedAt,
          },
        });
        taskId = existing.id;
        result.updated++;
      } else {
        const maxOrder = await prisma.task.aggregate({
          where: { projectId, status },
          _max: { orderIndex: true },
        });
        const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

        const task = await prisma.task.create({
          data: {
            companyId,
            projectId,
            title,
            summary,
            description,
            assigneeId,
            creatorName,
            reporterName,
            dueDate,
            priority,
            status,
            progress,
            orderIndex,
            createdAt,
            resolvedAt,
          },
        });
        taskId = task.id;
        result.created++;
      }

      // Import comments (skip if task already had comments)
      const existingComments = await prisma.comment.count({ where: { taskId } });
      if (existingComments === 0) {
        const parsedComments = parseJiraComments(row, jiraIdToName);
        for (const c of parsedComments) {
          await prisma.comment.create({
            data: {
              companyId,
              taskId,
              authorId: null,
              authorName: c.authorName || null,
              body: c.body,
              createdAt: c.date ?? new Date(),
            },
          });
          result.commentsImported++;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      result.errors.push({ row: rowNum, message });
    }
  }

  result.projectsCreated = [...createdProjects];
  result.usersCreated = [...createdUsers];
  return result;
}
