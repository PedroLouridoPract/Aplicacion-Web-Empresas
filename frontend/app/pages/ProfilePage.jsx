import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import Avatar, { getColorForName } from "../components/Avatar";

const roleLabels = {
  ADMIN: "Administrador",
  MEMBER: "Miembro",
  GUEST: "Invitado",
};

const roleStyles = {
  ADMIN: "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  MEMBER: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200",
  GUEST: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
};

const TABS = [
  { id: "personal", label: "Datos personales" },
  { id: "security", label: "Seguridad" },
  { id: "notifications", label: "Notificaciones" },
];

const NOTIFICATION_SETTINGS = [
  {
    group: "Notificaciones Generales",
    items: [
      {
        key: "task_assignment",
        label: "Asignación de Tareas",
        description: "Recibe alertas cuando te asignan una tarea o cuando se reasigna una tarea tuya.",
      },
      {
        key: "task_comments",
        label: "Comentarios y Menciones",
        description: "Recibe notificaciones cuando alguien responde a tus comentarios o te menciona en una tarea.",
      },
      {
        key: "absence_requests",
        label: "Solicitudes de Ausencia",
        description: "Recibe notificaciones cuando los empleados envían o cancelan solicitudes de ausencia.",
      },
      {
        key: "absence_status",
        label: "Estado de Ausencias",
        description: "Recibe alertas cuando tus solicitudes de ausencia son aprobadas o rechazadas.",
      },
    ],
  },
];

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

const inputBase =
  "w-full rounded-lg border px-4 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
const inputEditable =
  `${inputBase} border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-400`;
const inputReadonly =
  `${inputBase} border-transparent bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 cursor-default`;

function NotificationsTab({ prefs, loading, saving, msg, onToggle, onLoad }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) {
      onLoad();
      setLoaded(true);
    }
  }, [loaded, onLoad]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Notificaciones</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Administra cómo recibes actualizaciones sobre eventos importantes dentro de tu organización.
        </p>
      </div>

      {msg.text && (
        <div className={`mb-5 rounded-lg px-4 py-2.5 text-sm transition-opacity ${
          msg.type === "success"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
            : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
        }`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-8">
        {NOTIFICATION_SETTINGS.map((group) => (
          <div key={group.group}>
            <h4 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-100">{group.group}</h4>
            <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-800">
              {group.items.map((item) => {
                const isOn = prefs[item.key] !== false;
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="pr-4">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.label}</p>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                    <ToggleSwitch
                      checked={isOn}
                      onChange={(val) => onToggle(item.key, val)}
                      disabled={saving}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function ProfilePage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });

  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const [notifPrefs, setNotifPrefs] = useState({});
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState({ type: "", text: "" });

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await apiFetch("/profile/me");
      setProfile(data);
      setForm({ name: data.name || "", email: data.email || "", phone: data.phone || "" });
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function handleCancelEdit() {
    setEditing(false);
    setProfileMsg({ type: "", text: "" });
    if (profile) {
      setForm({ name: profile.name || "", email: profile.email || "", phone: profile.phone || "" });
    }
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setProfileMsg({ type: "", text: "" });
    try {
      const data = await apiFetch("/profile/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
        }),
      });
      setProfile(data);
      setEditing(false);
      setProfileMsg({ type: "success", text: "Datos actualizados correctamente" });
      if (refreshUser) refreshUser();
    } catch (err) {
      setProfileMsg({ type: "error", text: err.message || "Error al actualizar" });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPwMsg({ type: "", text: "" });
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: "error", text: "Las contraseñas nuevas no coinciden" });
      return;
    }
    setPwSaving(true);
    try {
      await apiFetch("/profile/me/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwMsg({ type: "success", text: "Contraseña actualizada correctamente" });
    } catch (err) {
      setPwMsg({ type: "error", text: err.message || "Error al cambiar contraseña" });
    } finally {
      setPwSaving(false);
    }
  }

  async function loadNotifPrefs() {
    setNotifLoading(true);
    try {
      const data = await apiFetch("/profile/me/notification-preferences");
      setNotifPrefs(data || {});
    } catch {
      setNotifPrefs({});
    } finally {
      setNotifLoading(false);
    }
  }

  async function handleToggleNotif(key, value) {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    setNotifSaving(true);
    setNotifMsg({ type: "", text: "" });
    try {
      await apiFetch("/profile/me/notification-preferences", {
        method: "PATCH",
        body: JSON.stringify(updated),
      });
      setNotifMsg({ type: "success", text: "Preferencias actualizadas" });
      setTimeout(() => setNotifMsg({ type: "", text: "" }), 2000);
    } catch (err) {
      setNotifPrefs({ ...notifPrefs });
      setNotifMsg({ type: "error", text: err.message || "Error al guardar" });
    } finally {
      setNotifSaving(false);
    }
  }

  async function handleAvatarUpload(file) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const data = await apiFetch("/profile/me/avatar", {
        method: "POST",
        body: formData,
      });
      setProfile(data);
      if (refreshUser) refreshUser();
    } catch {
      // silently fail
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  const role = (profile?.role || "").toUpperCase();

  return (
    <div className="flex flex-col gap-0 lg:flex-row lg:gap-6">
      {/* ── Left panel ── */}
      <div className="w-full shrink-0 lg:w-72">
        <div className="content-card p-6">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="group relative">
              <Avatar
                name={profile?.name}
                src={profile?.avatarUrl}
                size="xl"
                className="ring-4 ring-indigo-100 dark:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition group-hover:bg-black/40"
              >
                <svg className="h-7 w-7 text-white opacity-0 transition group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0]); }} />
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">{profile?.name}</h2>
            <span className={`mt-1.5 inline-flex rounded-full px-3 py-0.5 text-xs font-medium ${roleStyles[role] || roleStyles.MEMBER}`}>
              {roleLabels[role] || role}
            </span>
          </div>

          {/* Divider */}
          <div className="my-5 border-t border-slate-100 dark:border-slate-800" />

          {/* Contact info */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Información de contacto</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Email</p>
                  <p className="truncate text-sm text-slate-700 dark:text-slate-200">{profile?.email || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Teléfono</p>
                  <p className="truncate text-sm text-slate-700 dark:text-slate-200">{profile?.phone || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Empresa</p>
                  <p className="truncate text-sm text-slate-700 dark:text-slate-200">{profile?.company?.name || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-5 border-t border-slate-100 dark:border-slate-800" />

          {/* Member since */}
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400 dark:text-slate-500">Miembro desde</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="mt-6 min-w-0 flex-1 lg:mt-0">
        {/* Tabs */}
        <div className="mb-0 flex gap-0 border-b border-slate-200 dark:border-slate-700">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setProfileMsg({ type: "", text: "" }); setPwMsg({ type: "", text: "" }); }}
              className={`relative px-5 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="content-card mt-0 rounded-t-none border-t-0 p-6">
          {activeTab === "personal" && (
            <>
              {/* Header with edit button */}
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Datos Personales</h3>
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => { setEditing(true); setProfileMsg({ type: "", text: "" }); }}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                  >
                    Editar
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      form="profile-form"
                      disabled={saving}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {saving ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                )}
              </div>

              {profileMsg.text && (
                <div className={`mb-5 rounded-lg px-4 py-2.5 text-sm ${
                  profileMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                }`}>
                  {profileMsg.text}
                </div>
              )}

              <form id="profile-form" onSubmit={handleProfileSubmit}>
                <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Nombre</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Tu nombre completo"
                      className={editing ? inputEditable : inputReadonly}
                      readOnly={!editing}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="tu@email.com"
                      className={editing ? inputEditable : inputReadonly}
                      readOnly={!editing}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Teléfono</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+34 600 000 000"
                      className={editing ? inputEditable : inputReadonly}
                      readOnly={!editing}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Rol</label>
                    <input
                      value={roleLabels[role] || role}
                      className={inputReadonly}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Empresa</label>
                    <input
                      value={profile?.company?.name || "—"}
                      className={inputReadonly}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Miembro desde</label>
                    <input
                      value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                      className={inputReadonly}
                      readOnly
                    />
                  </div>
                </div>
              </form>
            </>
          )}

          {activeTab === "security" && (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Cambiar contraseña</h3>
                <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Protege tu cuenta actualizando tu contraseña periódicamente</p>
              </div>

              {pwMsg.text && (
                <div className={`mb-5 rounded-lg px-4 py-2.5 text-sm ${
                  pwMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                }`}>
                  {pwMsg.text}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="max-w-md">
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Contraseña actual</label>
                    <input
                      type="password"
                      value={pwForm.currentPassword}
                      onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                      placeholder="••••••••"
                      className={inputEditable}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Nueva contraseña</label>
                    <input
                      type="password"
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                      className={inputEditable}
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Confirmar nueva contraseña</label>
                    <input
                      type="password"
                      value={pwForm.confirmPassword}
                      onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                      placeholder="Repite la nueva contraseña"
                      className={inputEditable}
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={pwSaving}
                      className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {pwSaving ? "Actualizando..." : "Cambiar contraseña"}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}

          {activeTab === "notifications" && (
            <NotificationsTab
              prefs={notifPrefs}
              loading={notifLoading}
              saving={notifSaving}
              msg={notifMsg}
              onToggle={handleToggleNotif}
              onLoad={loadNotifPrefs}
            />
          )}
        </div>
      </div>
    </div>
  );
}
