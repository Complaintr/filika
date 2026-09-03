"use client";

import { Copy, Mail, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FilikaBrand } from "@/components/filika-brand";
import styles from "../../app/landing.module.css";

const PRIMARY_EMAIL = "filika@complaintr.com" as const;
const CONTACT_EMAILS = [PRIMARY_EMAIL] as const;

export function ContactLink() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [copyStatus, setCopyStatus] = useState("");

  const open = () => {
    setCopyStatus("");
    dialogRef.current?.showModal();
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    dialogRef.current?.close();
    document.body.style.overflow = "";
    triggerRef.current?.focus();
  };

  useEffect(
    () => () => {
      document.body.style.overflow = "";
    },
    [],
  );

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      setCopyStatus(`${email} copied`);
    } catch {
      setCopyStatus("Could not copy the email");
    }
  }

  return (
    <>
      <button ref={triggerRef} type="button" className={styles.footerNavContact} onClick={open}>
        Contact
      </button>
      <dialog
        ref={dialogRef}
        className={styles.contactDialog}
        aria-labelledby="contact-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={close}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          }
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            close();
        }}
      >
        <header className={styles.contactDialogHeader}>
          <div className={styles.contactDialogBrand}>
            <FilikaBrand href="/" label="Filika home" />
          </div>
          <div className={styles.contactDialogHeaderActions}>
            <button
              type="button"
              className={styles.contactDialogClose}
              aria-label="Close contact dialog"
              onClick={close}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className={styles.contactDialogTitle}>
          <h2 id="contact-dialog-title">Contact Filika</h2>
          <p>Questions, feedback, or partnership ideas. Send a note to the team.</p>
        </div>
        <div className={styles.contactDialogInset}>
          <div className={styles.contactEmailList}>
            {CONTACT_EMAILS.map((email) => (
              <div className={styles.contactEmailRow} key={email}>
                <a className={styles.contactEmailLink} href={`mailto:${email}`}>
                  {email}
                </a>
                <div className={styles.contactEmailActions}>
                  <a className={styles.contactSend} href={`mailto:${email}`}>
                    <Mail aria-hidden="true" /> Send email
                  </a>
                  <button
                    type="button"
                    className={styles.contactCopy}
                    aria-label={`Copy ${email}`}
                    onClick={() => void copyEmail(email)}
                  >
                    <Copy aria-hidden="true" /> Copy email
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className={styles.contactDialogStatus} role="status">
            {copyStatus}
          </p>
        </div>
      </dialog>
    </>
  );
}
