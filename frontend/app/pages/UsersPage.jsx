import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/http";

const roleStyles = {
  admin: "bg-indigo-100 text-indigo-800",
  member: "bg-slate-100 text-slate-700",
  guest: "bg-slate-100 text-slate-500",
};

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Miembro" },
  { value: "guest", label: "Invitado" },
];

function Avatar({ name }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-sm font-bold text-white">
      {initial}
    </span>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member" });
  const [error, setError] = useState("");

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
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión de usuarios de la empresa (solo Admin)</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowCreate(true); setError(""); }}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700"
        >
          Crear usuario
        </button>
      </div>

      {showCreate && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Nuevo usuario</h2>
          <form onSubmit={handleCreate} className="mt-4 flex max-w-md flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre completo"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-800"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="usuario@empresa.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-800"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-800"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-800"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setError(""); }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm border border-slate-200/80">
          Cargando...
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <Avatar name={u.name} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">{u.name}</p>
                <p className="truncate text-sm text-slate-500">{u.email}</p>
              </div>
              {editingId === u.id ? (
                <div className="flex items-center gap-2">
                  <select
                    defaultValue={u.role}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                    onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      roleStyles[u.role] || roleStyles.member
                    }`}
                  >
                    {u.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingId(u.id)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Editar rol
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
