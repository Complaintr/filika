import type { Metadata } from "next";
import Script from "next/script";
import { AuthAwareShell } from "@/workspace/auth-aware-shell";

export const metadata: Metadata = {
  title: {
    default: "Filika · Feedback infrastructure for AI agents",
    template: "%s · Filika",
  },
  description:
    "Filika helps AI agents report bugs, blockers, and product feedback through WebMCP with code context and user review.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="referrer" content="no-referrer" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="stylesheet" href="/app.css" />
        <Script id="filika-theme" strategy="beforeInteractive">
          {`try {
  const saved = JSON.parse(localStorage.getItem("filika-workspace-v1") || "null");
  const preference = saved && ["light", "dark", "system"].includes(saved.theme) ? saved.theme : "light";
  const theme = preference === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : preference;
  document.documentElement.dataset.theme = theme;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", theme === "dark" ? "#0e0e10" : "#ffffff");
} catch {
  document.documentElement.dataset.theme = "light";
}`}
        </Script>
      </head>
      <body>
        <a className="skip-link" href="#app-content">
          Skip to content
        </a>
        <AuthAwareShell>{children}</AuthAwareShell>
      </body>
    </html>
  );
}
