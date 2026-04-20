"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api, setOnUnauthorized } from "./api";

let _healthPinged = false;
function pingHealth() {
  if (_healthPinged) return;
  _healthPinged = true;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  const targets = apiUrl ? [`${apiUrl}/api/health`, "/api/health"] : ["/api/health"];
  for (const url of targets) {
    fetch(url, { method: "GET", mode: "no-cors" }).catch(() => {});
  }
}

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
    pingHealth();

    const saved = localStorage.getItem("token");

    if (!saved) {
      setIsLoading(false);
      return;
    }

    // Optimistic: show cached username immediately while we verify the token.
    const cachedUser = localStorage.getItem("username");
    const cachedId = localStorage.getItem("userId");
    if (cachedUser) {
      setToken(saved);
      setUsername(cachedUser);
      setUserId(cachedId ? Number(cachedId) : null);
    }

    api
      .getMe()
      .then((data) => {
        setToken(saved);
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
