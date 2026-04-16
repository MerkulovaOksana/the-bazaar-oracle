"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api, setOnUnauthorized } from "./api";

interface AuthState {
  token: string | null;
  username: string | null;
  userId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutRef = useRef<() => void>(() => {});

  const clearSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    setToken(null);
    setUsername(null);
    setUserId(null);
  }, []);

  logoutRef.current = clearSession;

  useEffect(() => {
    setOnUnauthorized(() => logoutRef.current());
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("token");
    const savedName = localStorage.getItem("username");
    const savedId = localStorage.getItem("userId");

    if (!saved) {
      setIsLoading(false);
      return;
    }

    setToken(saved);
    setUsername(savedName);
    setUserId(savedId ? parseInt(savedId) : null);

    api
      .getMe()
      .then((data) => {
        setUsername(data.username);
        setUserId(data.user_id);
        localStorage.setItem("username", data.username);
        localStorage.setItem("userId", String(data.user_id));
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [clearSession]);

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

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
        userId,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout: clearSession,
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
