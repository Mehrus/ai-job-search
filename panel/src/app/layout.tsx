import type { Metadata } from "next";
import Link from "next/link";

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
              <span className="text-muted-foreground cursor-not-allowed" title="Etap 2">
                Aplikacje (wkrótce)
              </span>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
