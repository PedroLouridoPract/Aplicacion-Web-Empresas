import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login, registerCompany, user, booting } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!booting && user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  async function onSubmitLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Error de login");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerCompany(companyName, adminName, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Error al registrar empresa");
    } finally {
      setLoading(false);
    }
  }

  if (booting) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <p className="text-slate-500 dark:text-slate-400">Comprobando sesión...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-xl shadow-indigo-500/30">
            S
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Siweb</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Gestión de proyectos y equipos</p>
        </div>

        <div className="content-card p-8">
          <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === "login" ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === "register" ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              Registrar empresa
            </button>
          </div>

          {mode === "login" ? (
            <>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Accede con tu cuenta de empresa</p>
              <form onSubmit={onSubmitLogin} className="mt-5 flex flex-col gap-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="tu@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Contraseña</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                {error && <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">{error}</div>}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 w-full rounded-lg bg-indigo-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Alta de empresa</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Crea tu empresa y usuario administrador</p>
              <form onSubmit={onSubmitRegister} className="mt-5 flex flex-col gap-4">
                <div>
                  <label htmlFor="companyName" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Nombre de la empresa</label>
                  <input
                    id="companyName"
                    type="text"
                    placeholder="Mi Empresa S.L."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="adminName" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Tu nombre (admin)</label>
                  <input
                    id="adminName"
                    type="text"
                    placeholder="Nombre completo"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="regEmail" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
                  <input
                    id="regEmail"
                    type="email"
                    placeholder="admin@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="regPassword" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Contraseña</label>
                  <input
                    id="regPassword"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                {error && <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">{error}</div>}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 w-full rounded-lg bg-indigo-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
                >
                  {loading ? "Registrando..." : "Crear empresa"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
