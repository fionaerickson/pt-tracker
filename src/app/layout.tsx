import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "PT & Gym Recovery Tracker",
  description: "Track PT and gym sessions with adaptive prefills and progressive-overload nudges.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>
          <nav className="tabs">
            <Link href="/">Today</Link>
            <Link href="/bank">Exercise bank</Link>
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
