import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch } from "../api/http";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId?: string;
  company_id?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  booting: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  registerCompany: (
    companyName: string,
    adminName: string,
    email: string,
    password: string
  ) => Promise<{ token?: string; user?: AuthUser }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const token = getStoredToken();
        if (!token) {
          setUser(null);
          return;
        }
        const data = await apiFetch("/auth/me") as { user?: AuthUser };
        const userData = data?.user ?? data;
        setUser(userData && typeof userData === "object" && "id" in userData ? userData as AuthUser : null);
      } catch {
        setStoredToken(null);
        setUser(null);
      } finally {
        setBooting(false);
      }
    }
    bootstrap();
  }, []);

  async function login(email: string, password: string) {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }) as { token: string; user: AuthUser };
    setStoredToken(data.token);
    setUser(data.user);
  }

  async function registerCompany(
    companyName: string,
    adminName: string,
    email: string,
    password: string
  ) {
    const data = await apiFetch("/auth/register-company", {
      method: "POST",
      body: JSON.stringify({
        companyName,
        adminName,
        adminEmail: email,
        adminPassword: password,
      }),
    }) as { token?: string; user?: AuthUser };
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

  const value = useMemo<AuthContextValue>(
    () => ({ user, booting, login, logout, registerCompany }),
    [user, booting]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
