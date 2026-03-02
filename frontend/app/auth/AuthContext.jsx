// src/auth/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/http";

const AuthContext = createContext(null);

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function setStoredToken(token) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const token = getStoredToken();
        if (!token) {
          setUser(null);
          return;
        }
        const me = await apiFetch("/auth/me");
        setUser(me);
      } catch {
        setStoredToken(null);
        setUser(null);
      } finally {
        setBooting(false);
      }
    }
    bootstrap();
  }, []);

  async function login(email, password) {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    setUser(data.user);
  }

  async function registerCompany(companyName, adminName, email, password) {
    const data = await apiFetch("/auth/register-company", {
      method: "POST",
      body: JSON.stringify({
        company_name: companyName,
        admin_name: adminName,
        email,
        password,
      }),
    });
    if (data.token && data.user) {
      setStoredToken(data.token);
      setUser(data.user);
    }
    return data;
  }

  function logout() {
    setStoredToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, booting, login, logout, registerCompany }),
    [user, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}