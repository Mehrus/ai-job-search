import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { IntervioStatus } from "@/components/intervio-status";

import "./globals.css";

export const metadata: Metadata = {
  title: "Panel ofert pracy",
  description: "Lokalny panel do ofert, rankingu i aplikacji z ai-job-search",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-6 px-4">
            <Link href="/" className="font-semibold">
              Job Search Panel
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="hover:underline">
                Oferty
              </Link>
              <Link href="/applications" className="hover:underline">
                Aplikacje
              </Link>
              <Link href="/stats" className="hover:underline">
                Statystyki
              </Link>
            </nav>
            <Suspense fallback={null}>
              <IntervioStatus />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
