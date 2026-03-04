import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import Avatar from "../components/Avatar";
import CustomSelect from "../components/CustomSelect";

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
        <div />
        {isAdmin && (
          <button
            type="button"
            onClick={() => { setShowCreate(true); setError(""); }}
            className="rounded-lg bg-indigo-400 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
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
                className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Rol</label>
              <CustomSelect
                value={form.role}
                onChange={(val) => setForm((f) => ({ ...f, role: val }))}
                options={ROLES}
                className="w-full"
              />
            </div>
            {error && <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</div>}
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-indigo-400 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
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
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tareas</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Teléfono</th>
                    <th className="w-44 px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rol</th>
                    {isAdmin && <th className="w-20 px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"></th>}
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
                            <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                            <div>
                              <p className="font-medium text-slate-800 dark:text-slate-100">
                                {u.name}
                                {isSelf && <span className="ml-1.5 text-xs font-normal text-indigo-500 dark:text-indigo-400">(Tú)</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">
                            {u._count?.assignedTasks ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{u.email}</td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{u.phone || "—"}</td>
                        <td className="px-5 py-3.5">
                          {editingId === u.id && isAdmin && !isSelf ? (
                            <div className="flex items-center gap-2">
                              <CustomSelect
                                value={userRole}
                                onChange={(val) => handleUpdateRole(u.id, val)}
                                options={ROLES}
                                size="sm"
                              />
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

        {/* Selected user detail panel */}
        {selectedUser && (
          <div className="hidden w-80 shrink-0 lg:block">
            <div className="content-card p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar name={selectedUser.name} src={selectedUser.avatarUrl} size="lg" />
                <h3 className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-100">{selectedUser.name}</h3>
                <span className={`mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleStyles[(selectedUser.role || "").toLowerCase()] || roleStyles.member}`}>
                  {roleLabels[(selectedUser.role || "").toLowerCase()] || selectedUser.role}
                </span>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Tareas asignadas</p>
                  <p className="mt-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">{selectedUser._count?.assignedTasks ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Email</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Teléfono</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{selectedUser.phone || "—"}</p>
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
