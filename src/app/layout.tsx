import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "PT & Gym Recovery Tracker",
  description: "Track PT and gym sessions with adaptive prefills and progressive-overload nudges.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2b2d77",
};

const TABS = [
  { href: "/", ico: "🏠", label: "Today" },
  { href: "/plan", ico: "📋", label: "Plan" },
  { href: "/progress", ico: "📈", label: "Progress" },
  { href: "/bank", ico: "🏋️", label: "Bank" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
        <nav className="tabbar">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href}>
              <span className="ico">{t.ico}</span>
              {t.label}
            </Link>
          ))}
        </nav>
      </body>
    </html>
  );
}
