import { ArrowRight } from "lucide-react";
import styles from "./demo-signup-cta.module.css";

export function DemoSignupCta() {
  return (
    <aside className={styles.cta}>
      <div className={styles.ctaBody}>
        <strong className={styles.ctaTitle}>See Filika on your own site</strong>
        <p className={styles.ctaText}>
          Create a free account, connect a website, and your browser agent will report bugs and
          blocked tasks straight to your Filika inbox.
        </p>
      </div>
      <a className={styles.ctaAction} href="/register">
        Create an account <ArrowRight aria-hidden="true" />
      </a>
    </aside>
  );
}
