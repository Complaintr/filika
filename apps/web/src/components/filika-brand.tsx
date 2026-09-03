import Image from "next/image";
import Link from "next/link";
import type { MouseEventHandler } from "react";

export function FilikaBrand({
  href,
  label,
  className,
  onClick,
}: {
  href: string;
  label: string;
  className?: string | undefined;
  onClick?: MouseEventHandler<HTMLAnchorElement> | undefined;
}) {
  return (
    <Link
      href={href}
      className={`filika-brand${className ? ` ${className}` : ""}`}
      aria-label={label}
      {...(onClick ? { onClick } : {})}
    >
      <Image
        className="filika-brand-symbol"
        src="/filika-logo.svg"
        width={22}
        height={22}
        alt=""
        unoptimized
      />
      <span className="filika-brand-wordmark">Filika</span>
    </Link>
  );
}
