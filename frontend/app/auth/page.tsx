"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
      }
      router.push("/app/predict");
    } catch (err: any) {
      setError(err.message || "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card-gradient rounded-2xl border border-bazaar-accent/20 p-8 shadow-xl shadow-bazaar-purple/10">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔮</div>
            <h1 className="text-2xl font-bold text-bazaar-warm">
              {isLogin ? "Вход" : "Регистрация"}
            </h1>
            <p className="text-sm text-bazaar-muted mt-1">
              {isLogin
                ? "Добро пожаловать в The Bazaar Oracle"
                : "Создай аккаунт для предсказаний"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-bazaar-muted mb-1">
                Имя пользователя
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-bazaar-bg border border-bazaar-accent/20 rounded-lg px-4 py-2.5 text-bazaar-text focus:outline-none focus:border-bazaar-accent transition"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-bazaar-muted mb-1">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bazaar-bg border border-bazaar-accent/20 rounded-lg px-4 py-2.5 text-bazaar-text focus:outline-none focus:border-bazaar-accent transition"
                required
                minLength={4}
              />
            </div>

            {error && (
              <p className="text-bazaar-red text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold-gradient hover:brightness-110 disabled:opacity-50 text-bazaar-bg font-bold py-2.5 rounded-lg transition"
            >
              {loading
                ? "Загрузка..."
                : isLogin
                ? "Войти"
                : "Создать аккаунт"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-sm text-bazaar-accent hover:text-bazaar-gold transition"
            >
              {isLogin
                ? "Нет аккаунта? Зарегистрируйся"
                : "Уже есть аккаунт? Войти"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
