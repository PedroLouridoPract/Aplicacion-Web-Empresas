// src/router/router.jsx
import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import ProtectedRoute from "../auth/ProtectedRoute";
import RequireRole from "../auth/RequireRole";
import AppLayout from "../layouts/AppLayout";

import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import ProjectsPage from "../pages/ProjectsPage";
import ProjectKanbanPage from "../pages/ProjectKanbanPage";
import ProjectExecutivePage from "../pages/ProjectExecutivePage";
import UsersPage from "../pages/UsersPage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/login", element: <LoginPage /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/projects", element: <ProjectsPage /> },
          { path: "/projects/:id/kanban", element: <ProjectKanbanPage /> },
          { path: "/projects/:id/executive", element: <ProjectExecutivePage /> },
          {
            path: "/users",
            element: (
              <RequireRole role="admin">
                <UsersPage />
              </RequireRole>
            ),
          },
        ],
      },
    ],
  },
]);