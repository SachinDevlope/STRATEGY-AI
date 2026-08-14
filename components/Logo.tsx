import Link from "next/link";
import { BRAND_ICON, BRAND_NAME } from "@/lib/brand";

/**
 * The single brand mark. Every place that draws the logo — navbar, footer,
 * auth pages, loading screens — pulls the glyph and wordmark from here so
 * they can never drift apart.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`material-symbols-outlined text-primary-container ${className}`}
      aria-hidden="true"
    >
      {BRAND_ICON}
    </span>
  );
}

/** Logo as a link home. `className` styles the wordmark and layout. */
export default function Logo({
  className = "font-display text-headline-lg font-bold tracking-tight text-on-surface",
  iconClassName = "",
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <Link href="/" className={`flex items-center gap-2 w-fit ${className}`}>
      <LogoMark className={iconClassName} />
      {BRAND_NAME}
    </Link>
  );
}
