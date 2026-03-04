import { useEffect, useState } from "react";
import { Link, Links, Navigate, Outlet, Scripts, useLocation } from "react-router";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import { getColorForName } from "./components/Avatar";
import NotificationBell from "./components/NotificationBell";
import "./app.css";

function LiveClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = String(time.getHours()).padStart(2, "0");
  const m = String(time.getMinutes()).padStart(2, "0");
  const s = String(time.getSeconds()).padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-sm px-3 py-1.5">
      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
      <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200 tracking-wide">
        {h}:{m}:{s}
      </span>
    </div>
  );
}

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/dashboard": (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  ),
  "/my-tasks": (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  "/projects": (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  "/users": (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  "/import": (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  "/holidays": (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  "/absences": (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
};

function getPageTitle(pathname: string): string {
  if (pathname === "/" || pathname === "/dashboard") return "Dashboard";
  if (pathname === "/my-tasks") return "Mis tareas";
  if (pathname.startsWith("/projects") && pathname.includes("/kanban")) return "Kanban";
  if (pathname.startsWith("/projects") && pathname.includes("/executive")) return "Vista ejecutiva";
  if (pathname.match(/^\/projects\/[^/]+$/)) return "Detalle del proyecto";
  if (pathname === "/projects") return "Proyectos";
  if (pathname === "/users") return "Empleados";
  if (pathname === "/profile") return "Mi perfil";
  if (pathname === "/import") return "Importar CSV";
  if (pathname === "/holidays") return "Calendario de festivos";
  if (pathname === "/absences") return "Ausencias";
  return "Siweb";
}

function getInitials(name?: string): string {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();
}

function AppShell() {
  const { user, booting, logout } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const loc = useLocation();
  const isLoginPage = loc.pathname === "/login";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
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
    { to: "/users", label: "Empleados", hide: isGuest },
    { to: "/import", label: "Importar", hide: isGuest },
    { to: "/holidays", label: "Calendario festivos" },
    { to: "/absences", label: "Ausencias", hide: isGuest },
  ];
  const navItems = allNavItems.filter((item) => !item.hide);

  const pageTitle = getPageTitle(loc.pathname);

  return (
    <div className="flex h-screen bg-slate-100/80 dark:bg-slate-950">
      {/* Collapsible sidebar */}
      <div className="relative shrink-0 p-3 pr-0">
        <aside
          className={`sidebar-narrow relative flex h-full flex-col py-4 rounded-2xl bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 ease-in-out ${
            sidebarOpen ? "w-[240px]" : "w-[72px]"
          }`}
        >
          {/* Logo */}
          <div className={`mb-6 flex items-center ${sidebarOpen ? "px-4" : "justify-center"}`}>
            <Link
              to={isAdmin ? "/dashboard" : "/my-tasks"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/30"
            >
              S
            </Link>
            {sidebarOpen && (
              <span className="ml-3 text-base font-bold tracking-tight text-slate-800 dark:text-slate-100">Siweb</span>
            )}
          </div>

        {/* Nav items */}
        <nav className={`flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden ${sidebarOpen ? "px-3" : "items-center px-1.5"}`}>
          {navItems.map(({ to, label }) => {
            const isActive =
              to === "/dashboard"
                ? loc.pathname === "/" || loc.pathname === "/dashboard"
                : loc.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                title={!sidebarOpen ? label : undefined}
                className={`group relative flex h-10 shrink-0 items-center gap-3 rounded-xl transition-all ${
                  sidebarOpen ? "px-3" : "w-10 justify-center"
                } ${
                  isActive
                    ? "bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-500/15 dark:text-indigo-400"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <span className="shrink-0">
                  {NAV_ICONS[to] || <span className="text-xs font-bold">{label[0]}</span>}
                </span>
                {sidebarOpen && (
                  <span className={`whitespace-nowrap text-sm font-medium ${
                    isActive ? "text-indigo-700 dark:text-indigo-300" : "text-slate-600 dark:text-slate-300"
                  }`}>
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className={`mt-auto flex flex-col gap-1.5 ${sidebarOpen ? "px-3" : "items-center"}`}>
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Modo claro" : "Modo oscuro"}
            className={`flex h-10 shrink-0 items-center gap-3 rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300 ${
              sidebarOpen ? "px-3" : "w-10 justify-center"
            }`}
          >
            {isDark ? (
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            {sidebarOpen && <span className="whitespace-nowrap text-sm font-medium">{isDark ? "Modo claro" : "Modo oscuro"}</span>}
          </button>
          <button
            type="button"
            onClick={() => { logout(); }}
            title="Cerrar sesión"
            className={`flex h-10 shrink-0 items-center gap-3 rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 ${
              sidebarOpen ? "px-3" : "w-10 justify-center"
            }`}
          >
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {sidebarOpen && <span className="whitespace-nowrap text-sm font-medium">Cerrar sesión</span>}
          </button>

        </div>

          {/* Toggle button on sidebar edge */}
          <button
            type="button"
            onClick={() => setSidebarOpen(v => !v)}
            className="absolute -right-3 top-5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            title={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
          >
            <svg className={`h-3 w-3 text-slate-500 transition-transform duration-300 dark:text-slate-400 ${sidebarOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </aside>
      </div>

      {/* Main area */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Top-right icons */}
        <div className="absolute right-6 top-5 z-20 flex items-center gap-3">
          <LiveClock />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-sm">
            <NotificationBell />
          </div>
          <Link to="/profile" className="transition hover:opacity-80">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white overflow-hidden"
              style={!user?.avatarUrl ? { backgroundColor: getColorForName(user?.name) } : undefined}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                getInitials(user?.name)
              )}
            </div>
          </Link>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 pt-[37px] pb-6 lg:px-8">
            <h1 className="mb-4 text-2xl font-bold text-slate-800 dark:text-slate-100">{pageTitle}</h1>
            <Outlet />
          </div>
        </main>
      </div>
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
