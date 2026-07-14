import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient } from "../api/client";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, companyId: string, service: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("iticket_token");
    if (!token) {
      setLoading(false);
      return;
    }
    apiClient
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem("iticket_token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await apiClient.post("/auth/login", { email, password });
    localStorage.setItem("iticket_token", res.data.token);
    setUser(res.data.user);
  }

  async function register(name: string, email: string, password: string, companyId: string, service: string) {
    const res = await apiClient.post("/auth/register", { name, email, password, companyId, service });
    localStorage.setItem("iticket_token", res.data.token);
    setUser(res.data.user);
  }

  function logout() {
    localStorage.removeItem("iticket_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}
