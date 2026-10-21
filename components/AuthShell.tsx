import Logo from "@/components/Logo";

const PROOF_POINTS = [
  "ATS-optimized resumes that parse in Workday, Greenhouse, and Lever",
  "Live AI mock interviews with an honest scorecard",
  "STAR story builder for behavioral rounds",
];

/** Split layout shared by /login and /signup. */
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="flex-grow grid grid-cols-1 lg:grid-cols-2">
      {/* Form side */}
      <div className="flex items-center justify-center px-margin-mobile md:px-margin-desktop py-16">
        <div className="w-full max-w-md flex flex-col gap-8">
          <Logo className="font-display text-headline-lg font-bold text-on-surface tracking-tight" />

          <div className="flex flex-col gap-3">
            <p className="text-label-md text-primary uppercase tracking-widest">
              {eyebrow}
            </p>
            <h1 className="text-headline-lg-mobile text-on-surface">{title}</h1>
            <p className="text-body-md text-on-surface-variant">{subtitle}</p>
          </div>

          {children}

          <p className="text-body-sm text-on-surface-variant">{footer}</p>
        </div>
      </div>

      {/* Marketing side */}
      <div className="hidden lg:flex flex-col justify-center gap-8 bg-surface-container-low border-l border-outline-variant/30 px-16 py-16">
        <h2 className="text-headline-lg text-on-surface max-w-md">
          Land interviews at the companies you actually want.
        </h2>
        <ul className="flex flex-col gap-4 max-w-md">
          {PROOF_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-3">
              <span aria-hidden="true" className="material-symbols-outlined text-primary">
                check_circle
              </span>
              <span className="text-body-md text-on-surface-variant">
                {point}
              </span>
            </li>
          ))}
        </ul>
        <div className="bg-surface-container border border-outline-variant/40 rounded-xl p-6 max-w-md">
          <p className="text-body-sm text-on-surface">
            &quot;The AI interviewer was brutal, but exactly what I needed. It
            grilled me on my system design tradeoffs just like the real
            loop.&quot;
          </p>
          <p className="text-body-sm font-bold text-on-surface mt-4">
            Aditya S.
          </p>
          <p className="text-body-sm text-on-surface-variant">SDE-2 at Amazon</p>
        </div>
      </div>
    </main>
  );
}
