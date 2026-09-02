"use client";

import { AlertTriangle, Bot } from "lucide-react";
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
      <section className={styles.widgetDiscovery}>
        <div className={styles.widgetSiteHeader}>
          <span className={styles.widgetSiteDots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className={styles.widgetSiteUrl}>checkout.example</span>
          <span className={styles.widgetBrokenTag}>
            <AlertTriangle aria-hidden="true" data-free-size="true" />
            Broken flow detected
          </span>
        </div>
        <div className={styles.widgetSitePreview}>
          <div className={styles.widgetSiteField}>
            <span>Email</span>
            <i aria-hidden="true" />
          </div>
          <div className={styles.widgetSiteField}>
            <span>Delivery address</span>
            <i aria-hidden="true" />
          </div>
          <span className={styles.widgetSiteBroken}>
            <span>Continue to payment</span>
            <AlertTriangle aria-hidden="true" data-free-size="true" />
          </span>
        </div>
        <div className={styles.widgetObservation}>
          <span className={styles.widgetAgentIcon}>
            <Bot aria-hidden="true" data-free-size="true" />
          </span>
          <p>Checkout button does not respond after address validation.</p>
        </div>
        <div className={styles.widgetChips}>
          <span>Route: /checkout</span>
          <span>Severity: Medium</span>
        </div>
      </section>
      <section className={styles.widgetFlow}>
        <span className={styles.widgetFlowTrack} aria-hidden="true" />
        <div className={styles.widgetStage}>
          <span className={styles.widgetStageNode} aria-hidden="true" />
          <div className={styles.widgetDraft}>
            <span className={styles.widgetStageLabel}>Draft report</span>
            <h3>Checkout cannot be completed</h3>
            <p>The payment step remains unavailable after valid address details are entered.</p>
            <span className={styles.widgetDraftBy}>
              <Bot aria-hidden="true" data-free-size="true" />
              Prepared by browser agent
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
