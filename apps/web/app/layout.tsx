import type { Metadata } from "next";
import { AuthAwareShell } from "@/workspace/auth-aware-shell";

export const metadata: Metadata = {
  title: {
    default: "Filika",
    template: "%s · Filika",
  },
  description:
    "Filika helps AI agents report bugs, blockers, and product feedback through WebMCP with structured, privacy-conscious reports.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="referrer" content="no-referrer" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="stylesheet" href="/app.css" />
        {/* Theme bootstrap runs before paint. React hoists external scripts,
            which avoids re-creating an inline <script> on the client. */}
        <script src="/theme-bootstrap.js" async />
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
