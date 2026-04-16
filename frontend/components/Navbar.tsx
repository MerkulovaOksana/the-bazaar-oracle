"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const { isAuthenticated, username, logout } = useAuth();

  return (
    <nav className="fixed top-0 w-full z-50 bg-bazaar-bg/90 backdrop-blur-md border-b border-bazaar-accent/15">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
        <Link
          href="/"
          className="text-lg font-bold text-bazaar-warm flex items-center gap-2 hover:text-bazaar-gold transition"
        >
          <span className="text-xl">🔮</span>
          <span>
            <span className="text-bazaar-accent">The Bazaar</span> Oracle
          </span>
        </Link>

        <div className="flex items-center gap-5">
          {isAuthenticated ? (
            <>
              <Link
                href="/app/predict"
                className="text-sm text-bazaar-muted hover:text-bazaar-warm transition"
              >
                Предсказание
              </Link>
              <Link
                href="/app/chat"
                className="text-sm text-bazaar-muted hover:text-bazaar-warm transition"
              >
                Ассистент
              </Link>
              <Link
                href="/app/dashboard"
                className="text-sm text-bazaar-muted hover:text-bazaar-warm transition"
              >
                Дашборд
              </Link>
              <span className="text-sm text-bazaar-accent font-medium">
                {username}
              </span>
              <button
                onClick={logout}
                className="text-sm text-bazaar-muted hover:text-bazaar-red transition"
              >
                Выйти
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="text-sm bg-gold-gradient hover:brightness-110 text-bazaar-bg font-semibold px-5 py-1.5 rounded-lg transition"
            >
              Войти
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
