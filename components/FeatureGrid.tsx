import type { Feature } from "@/lib/content";

type Props = {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle: string;
  features: Omit<Feature, "span">[];
};

export default function FeatureGrid({
  id,
  eyebrow,
  title,
  subtitle,
  features,
}: Props) {
  return (
    <section
      id={id}
      className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-12 md:py-32 flex flex-col gap-12"
    >
      <div className="text-center max-w-3xl mx-auto">
        {eyebrow ? (
          <p className="font-label-caps text-label-caps text-primary-fixed uppercase mb-4">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-headline-lg text-on-surface mb-4">
          {title}
        </h2>
        <p className="text-body-md text-on-surface-variant">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="glass-panel glass-panel-glow rounded-xl p-8 hover:-translate-y-1 flex flex-col gap-4"
          >
            <div className="w-12 h-12 bg-surface border border-outline-variant rounded flex items-center justify-center text-primary-fixed mb-2">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl">
                {feature.icon}
              </span>
            </div>
            <h3 className="font-display text-[20px] font-semibold text-on-surface">
              {feature.title}
            </h3>
            <p className="text-body-sm text-on-surface-variant flex-grow">
              {feature.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
