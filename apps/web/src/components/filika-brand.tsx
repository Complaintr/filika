import Image from "next/image";
import Link from "next/link";

export function FilikaBrand({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="filika-brand" aria-label={label}>
      <Image
        className="filika-brand-symbol"
        src="/filika-logo.svg"
        width={28}
        height={28}
        alt=""
        unoptimized
      />
      <span className="filika-brand-wordmark">Filika</span>
    </Link>
  );
}
