import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "PT & Gym Recovery Tracker",
  description: "Track PT and gym sessions with adaptive prefills and progressive-overload nudges.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          margin: 0,
          background: "#0f1115",
          color: "#e6e8eb",
        }}
      >
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>{children}</main>
      </body>
    </html>
  );
}
