function normalizeApiRoot(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  return trimmed.replace(/\/api$/i, "");
}

const apiRoot = normalizeApiRoot(process.env.NEXT_PUBLIC_API_URL);
const API_BASES = apiRoot ? [`${apiRoot}/api`, "/api"] : ["/api"];

const JSON_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void) {
  onUnauthorized = callback;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const isUpload = options.body instanceof FormData;
  const timeoutMs = isUpload ? UPLOAD_TIMEOUT_MS : JSON_TIMEOUT_MS;

  let res: Response | null = null;
  const networkErrors: string[] = [];
  for (const base of API_BASES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      res = await fetch(`${base}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      break;
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error(
          "Сервер не ответил вовремя. Проверь, что API запущен и NEXT_PUBLIC_API_URL указывает на него."
        );
      }
      networkErrors.push(`${base}${path}`);
      if (!apiRoot || base === "/api") {
        throw new Error(
          `Не удалось подключиться к API (${networkErrors.join(", ")}). Проверь CORS/HTTPS и NEXT_PUBLIC_API_URL.`
        );
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (!res) {
    throw new Error(
      `Не удалось подключиться к API (${networkErrors.join(", ")}). Проверь CORS/HTTPS и NEXT_PUBLIC_API_URL.`
    );
  }

  const isAuthEndpoint = path.startsWith("/auth/login") || path.startsWith("/auth/register");

  if (res.status === 401 && onUnauthorized && !isAuthEndpoint) {
    onUnauthorized();
    throw new Error("Сессия истекла, войдите заново");
  }

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: res.statusText || `HTTP ${res.status}` }));
    const detail =
      (typeof error?.detail === "string" && error.detail) ||
      (typeof error?.error?.message === "string" && error.error.message) ||
      res.statusText ||
      `HTTP ${res.status}`;
    throw new Error(detail);
  }

  return res.json();
}

export const api = {
  // Auth
  register: (username: string, password: string) =>
    request<{ access_token: string; username: string; user_id: number }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify({ username, password }) }
    ),

  login: (username: string, password: string) =>
    request<{ access_token: string; username: string; user_id: number }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) }
    ),

  getMe: () =>
    request<{ user_id: number; username: string }>("/auth/me"),

  // Predict
  predictScreenshot: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<any>("/predict/screenshot", { method: "POST", body: form });
  },

  predictManual: (data: {
    player_items: string[];
    player_hp: number;
    monster_items: string[];
    monster_hp: number;
    monster_name: string;
  }) =>
    request<any>("/predict/manual", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  predictPreset: (data: {
    player_items: string[];
    player_hp: number;
    monster_id: string;
  }) =>
    request<any>("/predict/preset", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getCatalog: () => request<{ items: any[] }>("/predict/catalog"),
  getMonsters: () => request<{ monsters: any[] }>("/predict/monsters"),

  // Chat
  sendMessage: (message: string, history?: any[]) =>
    request<{ reply: string }>("/chat/message", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),

  sendVoice: (file: Blob) => {
    const form = new FormData();
    form.append("file", file, "voice.webm");
    return request<{ reply: string }>("/chat/voice", {
      method: "POST",
      body: form,
    });
  },

  // Analytics
  getDashboard: () => request<any>("/analytics/dashboard"),
  getFunnel: () => request<any>("/analytics/funnel"),
  trackEvent: (eventType: string) =>
    request<any>(`/analytics/track?event_type=${eventType}`, {
      method: "POST",
    }),
};
