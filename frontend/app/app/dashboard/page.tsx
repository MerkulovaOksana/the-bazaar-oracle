"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

const FUNNEL_COLORS = ["#c9a84c", "#7c5cbf", "#b87333", "#38bdf8", "#4ade80"];

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    Promise.all([api.getDashboard(), api.getFunnel()])
      .then(([d, f]) => {
        setDashboard(d);
        setFunnel(f);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-4xl mb-4 animate-pulse" aria-hidden>
          🔮
        </div>
        <p className="text-bazaar-muted text-sm">Проверяем сессию…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-bazaar-muted text-sm">Перенаправление на страницу входа…</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-bazaar-muted animate-pulse">Загрузка дашборда...</div>
      </div>
    );
  }

  const statCards = dashboard
    ? [
        { label: "Всего предсказаний", value: dashboard.total_predictions, icon: "⚔" },
        { label: "Твои предсказания", value: dashboard.user_predictions, icon: "👤" },
        { label: "Пользователи", value: dashboard.total_users, icon: "👥" },
        { label: "Винрейт", value: dashboard.win_rate + "%", icon: "🏆" },
        { label: "Сообщения чата", value: dashboard.total_chats, icon: "💬" },
      ]
    : [];

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-bazaar-warm">Дашборд</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-4 text-center hover:border-bazaar-accent/30 transition"
          >
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-bazaar-warm">{s.value}</div>
            <div className="text-xs text-bazaar-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-6">
          <h2 className="text-lg font-semibold mb-4 text-bazaar-warm">Предсказания (7 дней)</h2>
          {dashboard?.daily_predictions?.length > 0 ? (
            <div className="space-y-2">
              {dashboard.daily_predictions.map((d: any) => {
                const maxCount = Math.max(
                  ...dashboard.daily_predictions.map((x: any) => x.count),
                  1
                );
                return (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="text-xs text-bazaar-muted w-12">
                      {d.date.slice(5)}
                    </span>
                    <div className="flex-1 h-5 bg-bazaar-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-bazaar-accent rounded-full transition-all"
                        style={{
                          width: Math.max((d.count / maxCount) * 100, 4) + "%",
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium w-6 text-right text-bazaar-warm">
                      {d.count}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-bazaar-muted">
              Нет данных — сделай первое предсказание!
            </div>
          )}
        </div>

        <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-6">
          <h2 className="text-lg font-semibold mb-4 text-bazaar-warm">Источники</h2>
          {dashboard?.source_breakdown &&
          Object.keys(dashboard.source_breakdown).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(dashboard.source_breakdown).map(
                ([source, count]) => (
                  <div key={source} className="flex items-center gap-3">
                    <span className="text-sm w-20 text-bazaar-muted capitalize">
                      {source === "web" ? "Веб" : source === "telegram" ? "Telegram" : source === "api" ? "API" : source}
                    </span>
                    <div className="flex-1 h-6 bg-bazaar-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-bazaar-accent rounded-full"
                        style={{
                          width: ((count as number) / Math.max(dashboard.total_predictions, 1)) * 100 + "%",
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right text-bazaar-warm">
                      {count as number}
                    </span>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-bazaar-muted">
              Нет данных
            </div>
          )}
        </div>

        <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4 text-bazaar-warm">Продуктовая воронка</h2>
          {funnel?.funnel?.length > 0 ? (
            <div className="space-y-3">
              {funnel.funnel.map((step: any, i: number) => {
                const maxCount = funnel.funnel[0]?.count || 1;
                const pct = Math.max(
                  ((step.count / maxCount) * 100),
                  8
                );
                return (
                  <div key={step.step} className="flex items-center gap-4">
                    <span className="text-sm w-36 text-bazaar-muted">
                      {step.step}
                    </span>
                    <div className="flex-1 h-8 bg-bazaar-bg rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all duration-500"
                        style={{
                          width: pct + "%",
                          background: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-bazaar-warm">
                        {step.count} &mdash; {step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-bazaar-muted">
              Недостаточно данных для воронки
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
