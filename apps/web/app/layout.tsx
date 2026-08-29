import type { Metadata } from "next";
import Script from "next/script";
import { WorkspaceShell } from "@/workspace/workspace-shell";

export const metadata: Metadata = {
  title: "Dashboard · Filika",
  description: "Your Filika workspace for reviewing complaints and understanding product feedback.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="referrer" content="no-referrer" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#f7f8fa" />
        <link rel="stylesheet" href="/app.css" />
        <Script id="filika-theme" strategy="beforeInteractive">
          {`try {
  const saved = JSON.parse(localStorage.getItem("filika-workspace-v1") || "null");
  const theme = saved && saved.theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", theme === "dark" ? "#0e0e10" : "#f7f8fa");
} catch {
  document.documentElement.dataset.theme = "light";
}`}
        </Script>
      </head>
      <body>
        <a className="skip-link" href="#app-content">
          Skip to content
        </a>
        <WorkspaceShell>{children}</WorkspaceShell>
      </body>
    </html>
  );
}
