import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "The Bazaar Oracle — Предсказатель боёв",
  description: "Загрузи скриншот PvE-боя в The Bazaar и узнай, победишь ты или нет",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased bg-bazaar-bg">
        <AuthProvider>
          <Navbar />
          <main className="pt-14">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
