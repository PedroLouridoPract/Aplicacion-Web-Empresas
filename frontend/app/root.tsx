import { Link, Links, Navigate, Outlet, Scripts, useLocation } from "react-router";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ThemeProvider } from "./theme/ThemeContext";
// @ts-expect-error UserMenu.jsx sin declaración de tipos
import UserMenu from "./components/UserMenu";
import "./app.css";

function AppShell() {
  const { user, booting } = useAuth();
  const loc = useLocation();
  const isLoginPage = loc.pathname === "/login";

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100/90 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user && !isLoginPage) {
    return <Navigate to="/login" replace />;
  }

  if (isLoginPage && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30">
        <Outlet />
      </div>
    );
  }

  if (isLoginPage && user) {
    return <Navigate to="/my-tasks" replace />;
  }

  const role = (user?.role && String(user.role).toUpperCase()) || "";
  const isAdmin = role === "ADMIN";
  const isGuest = role === "GUEST";

  const allNavItems = [
    { to: "/dashboard", label: "Dashboard", hide: !isAdmin },
    { to: "/my-tasks", label: "Mis tareas" },
    { to: "/projects", label: "Proyectos" },
    { to: "/users", label: "Usuarios", hide: isGuest },
    { to: "/import", label: "Importar CSV", hide: isGuest },
  ];
  const navItems = allNavItems.filter((item) => !item.hide);

  return (
    <div className="flex h-screen bg-slate-100/80 dark:bg-slate-950">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-6 dark:border-slate-800">
          <Link to={isAdmin ? "/dashboard" : "/my-tasks"} className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-md shadow-indigo-500/25">
              S
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Siweb</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {navItems.map(({ to, label }) => {
            const isActive = to === "/dashboard" ? (loc.pathname === "/" || loc.pathname === "/dashboard") : loc.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-500/15 dark:text-indigo-400"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-slate-100 p-3 dark:border-slate-800">
          <UserMenu />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}

export default function Root() {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Siweb - Gestión de proyectos</title>
        <Links />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
