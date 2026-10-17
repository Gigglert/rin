import type { Metadata, Viewport } from "next";
import { getContent } from "@/lib/content";
import "../globals.css";

const c = getContent("en");

export const metadata: Metadata = {
  title: c.site.title,
  description: c.site.description,
  alternates: { languages: { en: "/", ru: "/ru" } },
};

export const viewport: Viewport = { themeColor: "#FDFCF9", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
