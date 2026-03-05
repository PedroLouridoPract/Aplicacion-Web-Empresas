import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";

export default function DashboardPage() {
  const { user, booting } = useAuth();
  const navigate = useNavigate();
  const role = (user?.role && String(user.role).toUpperCase()) || "";
  const isAdmin = role === "ADMIN";
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (booting || !user || !isAdmin) return;
    apiFetch("/projects")
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.projects ?? res?.data ?? [];
        if (list.length > 0) {
          navigate(`/projects/${list[0].id}/dashboard`, { replace: true });
        } else {
          navigate("/projects", { replace: true });
        }
      })
      .catch(() => navigate("/projects", { replace: true }))
      .finally(() => setTried(true));
  }, [booting, user, isAdmin, navigate]);

  if (!booting && user && !isAdmin) return <Navigate to="/my-tasks" replace />;

  if (!tried) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-700" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-indigo-600" />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-400 dark:text-slate-500">Cargando...</p>
      </div>
    );
  }

  return null;
}
