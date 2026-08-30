import Image from "next/image";
import Link from "next/link";

export function FilikaBrand({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="filika-brand" aria-label={label}>
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
