import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login, registerCompany, user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user) navigate("/dashboard");

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

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/30">
            S
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-800">Siweb</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión de proyectos</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50">
          <div className="mb-6 flex gap-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === "login" ? "bg-white text-slate-800 shadow" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === "register" ? "bg-white text-slate-800 shadow" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Registrar empresa
            </button>
          </div>

          {mode === "login" ? (
            <>
              <h2 className="text-lg font-semibold text-slate-800">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-slate-500">Accede con tu cuenta de empresa</p>
              <form onSubmit={onSubmitLogin} className="mt-6 flex flex-col gap-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="tu@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-800 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-800 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-indigo-500/30 disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-800">Alta de empresa</h2>
              <p className="mt-1 text-sm text-slate-500">Crea tu empresa y usuario administrador</p>
              <form onSubmit={onSubmitRegister} className="mt-6 flex flex-col gap-4">
                <div>
                  <label htmlFor="companyName" className="mb-1.5 block text-sm font-medium text-slate-700">Nombre de la empresa</label>
                  <input
                    id="companyName"
                    type="text"
                    placeholder="Mi Empresa S.L."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-800 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="adminName" className="mb-1.5 block text-sm font-medium text-slate-700">Tu nombre (admin)</label>
                  <input
                    id="adminName"
                    type="text"
                    placeholder="Nombre completo"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-800 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="regEmail" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    id="regEmail"
                    type="email"
                    placeholder="admin@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-800 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="regPassword" className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
                  <input
                    id="regPassword"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-800 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-indigo-500/30 disabled:opacity-60"
                >
                  {loading ? "Registrando..." : "Crear empresa"}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            API: VITE_API_BASE_URL (ej: http://localhost:3000)
          </p>
        </div>
      </div>
    </div>
  );
}
