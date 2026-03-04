import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const loc = useLocation();

  const navLinkClass = (active) =>
    `block w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      active ? "bg-indigo-100 text-indigo-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-slate-50">
      <aside className="flex flex-col border-r border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-6 border-b border-slate-100 pb-4">
          <h1 className="text-lg font-bold text-slate-800">Siweb Projects</h1>
          <p className="mt-1 text-xs text-slate-500">
            {user?.name} · <span className="font-medium text-slate-700">{user?.role}</span>
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <Link to="/dashboard" className={navLinkClass(loc.pathname.startsWith("/dashboard"))}>
            Dashboard
          </Link>
          <Link to="/projects" className={navLinkClass(loc.pathname.startsWith("/projects"))}>
            Proyectos
          </Link>
          {user?.role === "admin" && (
            <Link to="/users" className={navLinkClass(loc.pathname.startsWith("/users"))}>
              Usuarios
            </Link>
          )}
        </nav>

        <button
          onClick={logout}
          className="mt-4 w-full rounded-full border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          Cerrar sesión
        </button>
      </aside>

      <main className="overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
