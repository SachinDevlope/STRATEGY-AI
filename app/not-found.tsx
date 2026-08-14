import Link from "next/link";

/**
 * Without this the App Router falls back to the pages-router error page, which
 * cannot be prerendered once a root loading.tsx exists ("Cannot find module for
 * page: /_document").
 */
export default function NotFound() {
  return (
    <main className="flex-grow flex items-center justify-center px-margin-mobile md:px-margin-desktop py-24">
      <div className="glass-panel rounded-xl w-full max-w-lg p-8 md:p-12 flex flex-col items-center text-center gap-4">
        <span
          aria-hidden
          className="material-symbols-outlined text-primary-container text-[56px] leading-none"
        >
          troubleshoot
        </span>
        <span className="font-label-caps text-label-caps uppercase text-primary-container">
          Error 404
        </span>
        <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface">
          This page does not exist
        </h1>
        <p className="text-body-md text-on-surface-variant">
          The link may be old, or the analysis you are after belongs to another
          account.
        </p>
        <Link
          href="/"
          className="mt-2 px-6 py-3 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed transition-colors"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
