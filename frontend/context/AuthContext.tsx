'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import * as authService from "@/services/storefront-auth.service";
import type { StorefrontUser } from "@/services/storefront-auth.service";

type AuthContextValue = {
  user: StorefrontUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StorefrontUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const me = await authService.getMe();
      setUser(me);
    } catch {
      localStorage.removeItem("authToken");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const session = await authService.login(email, password);
    localStorage.setItem("authToken", session.token);
    await loadUser();
  };

  const register = async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    const session = await authService.register(data);
    localStorage.setItem("authToken", session.token);
    await loadUser();
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
