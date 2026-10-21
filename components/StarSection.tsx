import Link from "next/link";
import { STAR_STEPS } from "@/lib/content";

// Each step fades slightly as it goes; the final "Result" gets the tertiary tone.
const CIRCLE_TONE = [
  "bg-primary-container text-on-primary-container",
  "bg-primary-container/70 text-on-primary-container",
  "bg-primary-container/45 text-on-primary-container",
  "bg-tertiary text-on-tertiary",
];

export default function StarSection() {
  return (
    <section
      id="star"
      className="py-12 md:py-32"
    >
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="glass-panel glass-panel-glow order-2 md:order-1 relative w-full aspect-square rounded-xl overflow-hidden p-8 flex flex-col justify-center gap-6">
          {STAR_STEPS.map((step, i) => (
            <div key={step.letter}>
              {i > 0 ? (
                <div className="w-0.5 h-4 bg-outline-variant/50 ml-5 mb-2" />
              ) : null}
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl shrink-0 ${CIRCLE_TONE[i]}`}
                >
                  {step.letter}
                </div>
                <div>
                  <h4 className="text-body-md font-bold text-on-surface">
                    {step.title}
                  </h4>
                  <p className="text-body-sm text-on-surface-variant">
                    {step.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="order-1 md:order-2 flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary-container/30 bg-primary-container/10 text-primary-fixed font-label-caps text-label-caps uppercase w-fit">
            <span aria-hidden="true" className="material-symbols-outlined text-[14px]">bolt</span>
            Behavioral Interviews
          </div>
          <h2 className="font-display text-headline-lg text-on-surface">
            STAR Story Builder
          </h2>
          <p className="text-body-md text-on-surface-variant">
            Don&apos;t stumble over behavioral questions. Our STAR Story Builder
            helps you structure compelling answers using the proven Situation,
            Task, Action, Result framework. Be prepared for any &quot;Tell me
            about a time when...&quot; question.
          </p>
          <Link
            href="/signup"
            className="mt-4 bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase py-4 px-8 rounded btn-glow transition-all duration-300 inline-flex items-center justify-center gap-2 w-full sm:w-fit"
          >
            Try the Story Builder
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
