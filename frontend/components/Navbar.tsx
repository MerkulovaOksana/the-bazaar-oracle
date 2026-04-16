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
          <a
            href="https://t.me/bazaar_oracle_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-bazaar-muted hover:text-[#29B6F6] transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            <span className="hidden sm:inline">Бот</span>
          </a>
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
