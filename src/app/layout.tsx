import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "PT & Gym Recovery Tracker",
  description: "Track PT and gym sessions with adaptive prefills and progressive-overload nudges.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#E35336",
};

const TABS = [
  { href: "/", icon: "home", label: "Today" },
  { href: "/plan", icon: "clipboard", label: "Plan" },
  { href: "/progress", icon: "trending", label: "Progress" },
  { href: "/bank", icon: "dumbbell", label: "Bank" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
        <nav className="tabbar">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href}>
              <Icon name={t.icon} size={22} />
              {t.label}
            </Link>
          ))}
        </nav>
      </body>
    </html>
  );
}
