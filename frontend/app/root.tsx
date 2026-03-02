import { Link, Links, Outlet, Scripts, useLocation } from "react-router";
import { AuthProvider } from "./auth/AuthContext";
import "./app.css";

export default function Root() {
  const loc = useLocation();

  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/projects", label: "Proyectos" },
    { to: "/users", label: "Usuarios" },
    { to: "/login", label: "Login" },
  ];

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Siweb - Gestión de proyectos</title>
        <Links />
      </head>
      <body>
        <AuthProvider>
        <div className="flex min-h-screen bg-slate-100/80">
          <aside className="flex w-56 flex-col border-r border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-6">
              <Link to="/dashboard" className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-md shadow-indigo-500/25">
                  S
                </span>
                <span className="text-xl font-bold tracking-tight text-slate-800">Siweb</span>
              </Link>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 p-3">
              {navItems.map(({ to, label }) => {
                const active = loc.pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? "bg-indigo-50 text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="flex-1 overflow-auto p-8">
            <Outlet />
          </main>
        </div>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
