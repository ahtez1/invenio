"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

import { api, clearTokens, getTokens, setTokens } from "./api";
import { User } from "./types";

interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const { access } = getTokens();
    if (!access) {
      setUser(null);
      return;
    }
    try {
      const response = await api.get<User>("/api/accounts/me/");
      setUser(response.data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const response = await api.post("/api/accounts/login/", { email, password });
    setTokens(response.data.access, response.data.refresh);
    await refreshUser();
  }

  async function register(payload: RegisterPayload) {
    await api.post("/api/accounts/register/", payload);
    await login(payload.email, payload.password);
  }

  function logout() {
    const { refresh } = getTokens();
    if (refresh) {
      api.post("/api/accounts/logout/", { refresh }).catch(() => {});
    }
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
