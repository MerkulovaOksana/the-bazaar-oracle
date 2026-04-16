"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "./api";

interface AuthState {
  token: string | null;
  username: string | null;
  userId: number | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("token");
    const savedName = localStorage.getItem("username");
    const savedId = localStorage.getItem("userId");
    if (saved) {
      setToken(saved);
      setUsername(savedName);
      setUserId(savedId ? parseInt(savedId) : null);
    }
  }, []);

  const handleAuth = useCallback(
    (data: { access_token: string; username: string; user_id: number }) => {
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("userId", String(data.user_id));
      setToken(data.access_token);
      setUsername(data.username);
      setUserId(data.user_id);
    },
    []
  );

  const login = useCallback(
    async (u: string, p: string) => {
      const data = await api.login(u, p);
      handleAuth(data);
    },
    [handleAuth]
  );

  const register = useCallback(
    async (u: string, p: string) => {
      const data = await api.register(u, p);
      handleAuth(data);
    },
    [handleAuth]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    setToken(null);
    setUsername(null);
    setUserId(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
        userId,
        isAuthenticated: !!token,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
