"use client";

import { AlertTriangle, Bot, Check, ShieldCheck } from "lucide-react";
import Image from "next/image";
import styles from "../../app/landing.module.css";
import { GithubIcon } from "../auth/github-icon";

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
        <div className={styles.widgetStage}>
          <span
            className={`${styles.widgetStageNode} ${styles.widgetStageNodeActive}`}
            aria-hidden="true"
          />
          <div className={styles.widgetReview}>
            <div className={styles.widgetReviewHeading}>
              <span className={styles.widgetReviewIcon}>
                <ShieldCheck aria-hidden="true" data-free-size="true" />
              </span>
              <div>
                <span className={styles.widgetStageLabel}>User review</span>
                <strong>Review before sending</strong>
              </div>
            </div>
            <div className={styles.widgetReviewReport}>
              <span className={styles.widgetReviewKind}>Bug</span>
              <strong>Checkout cannot be completed</strong>
              <p>The payment step remains unavailable after valid address details are entered.</p>
            </div>
            <p className={styles.widgetReviewPrivacy}>You control what gets shared.</p>
            <div className={styles.widgetReviewActions}>
              <button className={styles.widgetReviewSecondary} type="button">
                Edit report
              </button>
              <button className={styles.widgetReviewPrimary} type="button">
                Review &amp; confirm
              </button>
            </div>
          </div>
        </div>
        <div className={styles.widgetStage}>
          <span className={styles.widgetStageNode} aria-hidden="true" />
          <div className={styles.widgetReceipt}>
            <span className={styles.widgetStageLabel}>Ready for triage</span>
            <div className={styles.widgetReceiptHeader}>
              <span className={styles.widgetReceiptCheck}>
                <Check aria-hidden="true" data-free-size="true" />
              </span>
              <div>
                <strong>Report confirmed</strong>
                <p>Sent to your Filika inbox</p>
              </div>
            </div>
            <div className={styles.widgetGithub}>
              <GithubIcon />
              Issue ready for review
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
