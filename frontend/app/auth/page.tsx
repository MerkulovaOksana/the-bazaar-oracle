"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: "Слабый", color: "bg-red-500" };
  if (score <= 2) return { score: 2, label: "Нормальный", color: "bg-amber-500" };
  if (score <= 3) return { score: 3, label: "Хороший", color: "bg-yellow-400" };
  if (score <= 4) return { score: 4, label: "Сильный", color: "bg-green-400" };
  return { score: 5, label: "Отличный", color: "bg-emerald-400" };
}

export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/app/predict");
    }
  }, [authLoading, isAuthenticated, router]);

  const isRegister = tab === "register";
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const validationErrors = useMemo(() => {
    if (!isRegister) return [];
    const errs: string[] = [];
    if (username && username.length < 3) errs.push("Имя пользователя — минимум 3 символа");
    if (password && password.length < 6) errs.push("Пароль — минимум 6 символов");
    if (confirmPassword && password !== confirmPassword) errs.push("Пароли не совпадают");
    return errs;
  }, [isRegister, username, password, confirmPassword]);

  const canSubmit = isRegister
    ? username.length >= 3 && password.length >= 6 && password === confirmPassword && !loading
    : username.length > 0 && password.length > 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isRegister && password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
      router.push("/app/predict");
    } catch (err: any) {
      setError(err.message || "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t: "login" | "register") => {
    setTab(t);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="text-4xl mb-4 animate-pulse" aria-hidden>🔮</div>
        <p className="text-bazaar-muted text-sm mb-2">
          {isAuthenticated ? "Перенаправление..." : "Подключаемся к серверу..."}
        </p>
        {!isAuthenticated && (
          <p className="text-bazaar-muted/60 text-xs max-w-xs text-center">
            Бесплатный сервер может просыпаться до 30 секунд после неактивности
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-card-gradient rounded-2xl border border-bazaar-accent/20 shadow-2xl shadow-bazaar-purple/15 overflow-hidden">
          {/* Header */}
          <div className="relative pt-8 pb-5 px-8 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,92,191,0.15)_0%,transparent_70%)]" />
            <div className="relative">
              <img
                src="https://playthebazaar.com/images/bazaarLogo_small.webp"
                alt="The Bazaar"
                className="h-12 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(201,168,76,0.4)]"
              />
              <p className="text-xs text-bazaar-muted">
                {isRegister
                  ? "Создай аккаунт и предсказывай исходы боёв"
                  : "Войди, чтобы продолжить"}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mx-8 mb-6 bg-bazaar-bg/60 rounded-xl p-1 border border-bazaar-accent/10">
            <button
              type="button"
              onClick={() => switchTab("login")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === "login"
                  ? "bg-bazaar-surface text-bazaar-accent shadow-md"
                  : "text-bazaar-muted hover:text-bazaar-warm"
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => switchTab("register")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === "register"
                  ? "bg-bazaar-surface text-bazaar-accent shadow-md"
                  : "text-bazaar-muted hover:text-bazaar-warm"
              }`}
            >
              Регистрация
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm text-bazaar-muted mb-1.5 font-medium">
                Имя пользователя
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bazaar-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Введи никнейм"
                  className="w-full bg-bazaar-bg border border-bazaar-accent/20 rounded-xl pl-10 pr-4 py-3 text-bazaar-text placeholder:text-bazaar-muted/40 focus:outline-none focus:border-bazaar-accent focus:ring-1 focus:ring-bazaar-accent/30 transition"
                  required
                  autoFocus
                  autoComplete="username"
                  minLength={isRegister ? 3 : 1}
                />
              </div>
            </div>

            {/* Email — only for register */}
            {isRegister && (
              <div>
                <label className="block text-sm text-bazaar-muted mb-1.5 font-medium">
                  Email <span className="text-bazaar-muted/50 font-normal">(необязательно)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bazaar-muted">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-bazaar-bg border border-bazaar-accent/20 rounded-xl pl-10 pr-4 py-3 text-bazaar-text placeholder:text-bazaar-muted/40 focus:outline-none focus:border-bazaar-accent focus:ring-1 focus:ring-bazaar-accent/30 transition"
                    autoComplete="email"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm text-bazaar-muted mb-1.5 font-medium">
                Пароль
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bazaar-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? "Минимум 6 символов" : "Введи пароль"}
                  className="w-full bg-bazaar-bg border border-bazaar-accent/20 rounded-xl pl-10 pr-11 py-3 text-bazaar-text placeholder:text-bazaar-muted/40 focus:outline-none focus:border-bazaar-accent focus:ring-1 focus:ring-bazaar-accent/30 transition"
                  required
                  minLength={isRegister ? 6 : 1}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bazaar-muted hover:text-bazaar-warm transition"
                  tabIndex={-1}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>

              {/* Password strength */}
              {isRegister && password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          i <= strength.score ? strength.color : "bg-bazaar-surface"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-bazaar-muted">{strength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm password — only for register */}
            {isRegister && (
              <div>
                <label className="block text-sm text-bazaar-muted mb-1.5 font-medium">
                  Подтверди пароль
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bazaar-muted">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </span>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повтори пароль"
                    className={`w-full bg-bazaar-bg border rounded-xl pl-10 pr-11 py-3 text-bazaar-text placeholder:text-bazaar-muted/40 focus:outline-none focus:ring-1 transition ${
                      confirmPassword && password !== confirmPassword
                        ? "border-bazaar-red/50 focus:border-bazaar-red focus:ring-bazaar-red/30"
                        : confirmPassword && password === confirmPassword
                        ? "border-bazaar-green/50 focus:border-bazaar-green focus:ring-bazaar-green/30"
                        : "border-bazaar-accent/20 focus:border-bazaar-accent focus:ring-bazaar-accent/30"
                    }`}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-bazaar-muted hover:text-bazaar-warm transition"
                    tabIndex={-1}
                  >
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                {confirmPassword && password === confirmPassword && (
                  <p className="text-[11px] text-bazaar-green mt-1">Пароли совпадают</p>
                )}
              </div>
            )}

            {/* Validation hints */}
            {validationErrors.length > 0 && (
              <div className="space-y-1">
                {validationErrors.map((err) => (
                  <p key={err} className="text-[11px] text-bazaar-red/80 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-bazaar-red/60 shrink-0" />
                    {err}
                  </p>
                ))}
              </div>
            )}

            {/* Server error */}
            {error && (
              <div className="bg-bazaar-red/10 border border-bazaar-red/20 rounded-xl px-4 py-3">
                <p className="text-sm text-bazaar-red">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-gold-gradient hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 text-bazaar-bg font-bold py-3 rounded-xl transition-all text-base shadow-lg shadow-bazaar-accent/20 hover:shadow-xl hover:shadow-bazaar-accent/30 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Загрузка...
                </span>
              ) : isRegister ? (
                "Создать аккаунт"
              ) : (
                "Войти"
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-bazaar-accent/10" />
              <span className="text-[11px] text-bazaar-muted/60 uppercase tracking-wider">или</span>
              <div className="h-px flex-1 bg-bazaar-accent/10" />
            </div>

            {/* Telegram login hint */}
            <a
              href="https://t.me/bazaar_oracle_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl border border-[#29B6F6]/30 hover:border-[#29B6F6]/60 hover:bg-[#29B6F6]/5 text-[#29B6F6] transition-all text-sm font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Использовать Telegram-бот
            </a>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-xs text-bazaar-muted/50 mt-6">
          <Link href="/" className="hover:text-bazaar-accent transition">
            &larr; Вернуться на главную
          </Link>
        </p>
      </div>
    </div>
  );
}
