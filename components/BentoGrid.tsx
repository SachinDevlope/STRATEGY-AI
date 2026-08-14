import { BENTO_FEATURES } from "@/lib/content";

export default function BentoGrid() {
  return (
    <section
      id="features"
      className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto pb-12 md:pb-32 flex flex-col gap-12"
    >
      <div className="text-center max-w-2xl mx-auto flex flex-col gap-4">
        <p className="font-label-caps text-label-caps text-primary-fixed uppercase">
          Platform Features
        </p>
        <h2 className="font-display text-headline-lg-mobile md:text-headline-xl text-on-surface">
          Everything you need to land your dream role
        </h2>
        <p className="text-body-md text-on-surface-variant">
          A complete end-to-end system — from your first resume draft to your
          final interview round.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {BENTO_FEATURES.map((feature) => (
          <div
            key={feature.title}
            className={`${
              feature.span === 3 ? "md:col-span-3" : "md:col-span-2"
            } glass-panel glass-panel-glow rounded-xl p-8 flex flex-col gap-4 hover:-translate-y-1`}
          >
            <div
              className={`w-11 h-11 rounded bg-surface border border-outline-variant flex items-center justify-center ${
                feature.accent ? "text-tertiary" : "text-primary-fixed"
              }`}
            >
              <span className="material-symbols-outlined">{feature.icon}</span>
            </div>
            <h3
              className={`font-display ${
                feature.span === 3 ? "text-2xl" : "text-xl"
              } font-semibold text-on-surface mt-6`}
            >
              {feature.title}
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              {feature.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
