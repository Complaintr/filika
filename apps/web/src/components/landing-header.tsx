"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { FilikaBrand } from "@/components/filika-brand";
import { ThemeSwitcher } from "@/components/theme-switcher";
import styles from "../../app/landing.module.css";

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  const wrapperClasses = [
    styles.headerWrapper ?? "headerWrapper",
    isScrolled ? (styles.headerWrapperScrolled ?? "headerWrapperScrolled") : "",
  ]
    .filter(Boolean)
    .join(" ");

  const headerClasses = [
    styles.header ?? "header",
    isScrolled ? (styles.headerScrolled ?? "headerScrolled") : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClasses}>
      <header className={headerClasses}>
        <div className={styles.headerLeft}>
          <FilikaBrand href="/" label="Filika home" />
          <nav className={styles.nav} aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
          </nav>
        </div>

        <div className={styles.headerActions}>
          <ThemeSwitcher className={styles.themeSwitcher} />
          <a
            className={styles.secondaryButton}
            href="https://github.com/Complaintr/filika"
            rel="noreferrer"
            target="_blank"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.51 2.87 8.34 6.84 9.69.5.1.68-.22.68-.5v-1.73c-2.78.62-3.37-1.38-3.37-1.38-.45-1.18-1.1-1.5-1.1-1.5-.91-.63.06-.62.06-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.36-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.94c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9v2.82c0 .28.18.6.69.5A10.15 10.15 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
            </svg>
            <span>GitHub</span>
          </a>
          <a className={styles.primaryButton} href="/login">
            Get Started <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </header>
    </div>
  );
}
