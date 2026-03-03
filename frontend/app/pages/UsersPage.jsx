import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";

const roleStyles = {
  admin: "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  member: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200",
  guest: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
};

const roleLabels = {
  admin: "Administrador",
  member: "Miembro",
  guest: "Invitado",
};

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Miembro" },
  { value: "guest", label: "Invitado" },
];

function Avatar({ name, size = "md" }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  };
  return (
    <span className={`flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 dark:from-indigo-500 dark:to-violet-600 font-bold text-white ${sizes[size]}`}>
      {initial}
    </span>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const role = (user?.role && String(user.role).toUpperCase()) || "";
  const isAdmin = role === "ADMIN";
  const isGuest = role === "GUEST";

  if (isGuest) {
    return <Navigate to="/my-tasks" replace />;
  }

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member" });
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch("/users");
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      });
      setForm({ name: "", email: "", password: "", role: "member" });
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err.message || "Error al crear usuario");
    }
  }

  async function handleUpdateRole(userId, newRole) {
    try {
      await apiFetch(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message || "Error al actualizar rol");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de empleados de la empresa</p>
        {isAdmin && (
          <button
            type="button"
            onClick={() => { setShowCreate(true); setError(""); }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            + Nuevo empleado
          </button>
        )}
      </div>

      {showCreate && (
        <div className="content-card p-6">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Nuevo empleado</h2>
          <form onSubmit={handleCreate} className="mt-4 flex max-w-md flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Nombre</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre completo"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="usuario@empresa.com"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            {error && <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</div>}
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setError(""); }}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-6">
        {/* User list */}
        <div className="content-card flex-1 overflow-hidden">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Empleado</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rol</th>
                    {isAdmin && <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"></th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = user?.id === u.id;
                    const userRole = (u.role || "").toLowerCase();
                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className={`cursor-pointer border-b border-slate-50 transition hover:bg-indigo-50/30 dark:border-slate-800 dark:hover:bg-indigo-500/5 ${
                          selectedUser?.id === u.id ? "bg-indigo-50/50 dark:bg-indigo-500/10" : ""
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} size="sm" />
                            <div>
                              <p className="font-medium text-slate-800 dark:text-slate-100">
                                {u.name}
                                {isSelf && <span className="ml-1.5 text-xs font-normal text-indigo-500 dark:text-indigo-400">(Tú)</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{u.email}</td>
                        <td className="px-5 py-3.5">
                          {editingId === u.id && isAdmin && !isSelf ? (
                            <div className="flex items-center gap-2">
                              <select
                                defaultValue={userRole}
                                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-100"
                                onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                              >
                                {ROLES.map((r) => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
                              >
                                Cerrar
                              </button>
                            </div>
                          ) : (
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleStyles[userRole] || roleStyles.member}`}>
                              {roleLabels[userRole] || userRole}
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3.5">
                            {!isSelf && editingId !== u.id && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setEditingId(u.id); }}
                                className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                              >
                                Editar
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => {
            const isSelf = user?.id === u.id;
            return (
            <div
              key={u.id}
              className={`flex flex-wrap items-center gap-4 rounded-2xl border bg-white dark:bg-slate-800 p-5 shadow-sm transition hover:shadow-md ${isSelf ? "border-indigo-200 dark:border-indigo-500/30 ring-1 ring-indigo-100 dark:ring-indigo-500/20" : "border-slate-200/80 dark:border-slate-700"}`}
            >
              <Avatar name={u.name} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {u.name}
                  {isSelf && <span className="ml-1.5 text-xs font-normal text-indigo-500 dark:text-indigo-400">(Tú)</span>}
                </p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                  {u.email || <span className="italic text-amber-500 dark:text-amber-400">Sin email asignado</span>}
                </p>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Email</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Miembro desde</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString("es-ES") : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
