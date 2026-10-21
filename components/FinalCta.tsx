import Link from "next/link";

export default function FinalCta() {
  return (
    <section className="bg-surface-container-high border-t border-white/5 relative overflow-hidden py-12 md:py-32">
      {/* Radial cyan wash behind the CTA. */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-container/10 via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <div className="px-margin-mobile md:px-margin-desktop max-w-3xl mx-auto text-center flex flex-col items-center gap-8 relative z-10">
        <h2 className="font-display text-headline-lg-mobile md:text-headline-xl text-on-surface">
          Start Your Preparation Today
        </h2>
        <p className="text-body-md text-on-surface-variant max-w-2xl">
          Join thousands of candidates who have successfully landed roles at top
          tech companies. It&apos;s free to get started.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-3 bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase px-8 py-4 rounded btn-glow transition-all duration-300"
        >
          Build Resume Free
          <span aria-hidden="true" className="material-symbols-outlined">rocket_launch</span>
        </Link>
      </div>
    </section>
  );
}
