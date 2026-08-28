import type { Metadata } from "next";
import { WorkspaceShell } from "@/workspace/workspace-shell";

export const metadata: Metadata = {
  title: "Dashboard · Filika",
  description: "Your Filika workspace for reviewing complaints and understanding product feedback.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="referrer" content="no-referrer" />
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#f7f8fa" />
        <link rel="stylesheet" href="/app.css" />
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
