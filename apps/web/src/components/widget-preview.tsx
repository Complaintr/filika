"use client";

import Image from "next/image";
import styles from "../../app/landing.module.css";

export function WidgetPreview() {
  return (
    <div className={styles.widgetSurface}>
      <header className={styles.widgetHeader}>
        <span className={styles.widgetBrand}>
          <Image
            className={styles.widgetBrandMark}
            src="/filika-logo.svg"
            width={16}
            height={16}
            alt=""
            unoptimized
          />
          Filika
        </span>
        <span className={styles.widgetStatus}>
          <i aria-hidden="true" />
          WebMCP connected
        </span>
      </header>
      <p className={styles.widgetHelper}>Browser agent found a possible issue</p>
    </div>
  );
}
