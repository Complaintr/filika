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
      setIsScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className={`${styles.headerWrapper} ${isScrolled ? styles.headerWrapperScrolled : ""}`}>
      <header className={`${styles.header} ${isScrolled ? styles.headerScrolled : ""}`}>
        <FilikaBrand href="/" label="Filika home" className={styles.logo} />

        <nav className={styles.nav} aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#workflow">How it works</a>
          <a href="#safety">Safety</a>
        </nav>

        <div className={styles.headerActions}>
          <ThemeSwitcher className={styles.themeSwitcher} />
          <a className={styles.signInLink} href="/login">
            Sign in
          </a>
          <a className={styles.headerButton} href="/login">
            Open workspace
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </header>
    </div>
  );
}
