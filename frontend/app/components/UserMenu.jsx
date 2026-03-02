import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getRoleLabel(role) {
  const labels = { ADMIN: "Administrador", MEMBER: "Miembro", GUEST: "Invitado" };
  return labels[role] ?? role;
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  if (!user) return null;

  function handleLogout() {
    logout();
    setOpen(false);
    navigate("/login", { replace: true });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-2.5 text-left transition hover:bg-slate-100/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-sm">
          {getInitials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 z-20 mb-1 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Rol</p>
            <p className="text-sm font-medium text-slate-700">{getRoleLabel(user.role)}</p>
          </div>
          <Link
            to="/dashboard"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Ir al inicio
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
