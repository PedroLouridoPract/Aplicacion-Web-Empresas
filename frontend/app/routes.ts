// routes.ts
import type { RouteConfig } from "@react-router/dev/routes";

export default [
  {
    path: "/",
    id: "index",
    file: "./pages/DashboardPage.jsx",
  },
  {
    path: "/login",
    id: "login",
    file: "./pages/LoginPage.jsx",
  },
  {
    path: "/dashboard",
    id: "dashboard",
    file: "./pages/DashboardPage.jsx",
  },
  {
    path: "/my-tasks",
    id: "my-tasks",
    file: "./pages/MyTasksPage.jsx",
  },
  {
    path: "/projects",
    file: "./pages/ProjectsPage.jsx",
  },
  {
    path: "/projects/:id/kanban",
    file: "./pages/ProjectKanbanPage.jsx",
  },
  {
    path: "/projects/:id/executive",
    file: "./pages/ProjectExecutivePage.jsx",
  },
  {
    path: "/projects/:id",
    file: "./pages/ProjectDetailPage.jsx",
  },
  {
    path: "/users",
    file: "./pages/UsersPage.jsx",
  },
  {
    path: "*",
    id: "404",
    file: "./pages/NotFoundPage.jsx",
  },
] satisfies RouteConfig;