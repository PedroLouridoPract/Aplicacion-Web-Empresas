import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { notFound, errorHandler } from "./middleware/error";

import { authRoutes } from "./modules/auth/auth.routes";
import { projectsRoutes } from "./modules/projects/projects.routes";
import { tasksRoutes } from "./modules/tasks/tasks.routes";
import { usersRoutes } from "./modules/users/users.routes";
import { profileRoutes } from "./modules/users/profile.routes";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes";
import { commentsRoutes } from "./modules/comments/comments.routes";
import { importRoutes } from "./modules/import/import.routes";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/projects", projectsRoutes);
app.use("/tasks", tasksRoutes);
app.use("/users", usersRoutes);
app.use("/profile", profileRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/comments", commentsRoutes);
app.use("/import", importRoutes);

app.use(notFound);
app.use(errorHandler);