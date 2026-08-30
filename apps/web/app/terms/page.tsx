import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/auth/auth-header";

export const metadata: Metadata = { title: "Terms of Service · Filika" };

export default function TermsPage() {
  return (
    <main id="app-content" className="terms-page">
      <div className="terms-card">
        <AuthHeader />
        <article>
          <p>Using Filika</p>
          <h1>Terms of Service</h1>
          <p>Last updated: August 30, 2026</p>
          <h2>About these terms</h2>
          <p>
            These terms describe acceptable use of this Filika workspace. Filika is software for
            collecting and reviewing product feedback. The organization operating your workspace
            manages its availability and your access. Contact that organization if you have
            questions about these terms or how your information is handled.
          </p>
          <h2>Your account</h2>
          <p>
            Use an email address you control and keep your sign-in details secure. You are
            responsible for activity under your account. Do not share access without your workspace
            administrator’s permission. Contact your administrator if you believe someone else has
            accessed your account.
          </p>
          <h2>Feedback stays in your hands</h2>
          <p>
            Filika does not provide an AI assistant. A browser agent may draft feedback, but
            agent-authored feedback is sent only after you review and confirm it. You can edit or
            cancel a draft, or submit feedback manually. Review every report and include only
            information you are authorized to share.
          </p>
          <h2>Acceptable use</h2>
          <p>
            Do not use Filika to submit unlawful, abusive, or intentionally misleading content,
            distribute malware, interfere with the service, or access data without permission. Do
            not include passwords, access tokens, payment information, or confidential personal
            information in feedback.
          </p>
          <h2>Your content and data</h2>
          <p>
            You retain your rights to the content you submit. By submitting feedback, you allow the
            workspace operator to store, display, and use it to review and respond to the reported
            issue. Reports are available to maintainers with workspace access. The operator controls
            retention and handles requests for access or deletion.
          </p>
          <p>
            Filika uses account and session information for authentication. When email delivery is
            configured, authentication emails are delivered through Resend. Filika does not
            automatically collect page content, credentials, browsing history, or screenshots as
            part of a feedback report.
          </p>
          <h2>Availability and changes</h2>
          <p>
            Filika is under active development. Features may change and service may be interrupted.
            The workspace operator may restrict access for misuse or security reasons. Applicable
            law and any separate agreement with your workspace operator continue to apply.
          </p>
          <h2>Open-source software</h2>
          <p>
            The Filika source code is licensed under the Apache License, Version 2.0. These
            workspace usage terms do not replace or limit rights granted by that software license.
          </p>
        </article>
        <Link className="terms-back" href="/login">
          ← Back to sign in
        </Link>
      </div>
    </main>
  );
}
