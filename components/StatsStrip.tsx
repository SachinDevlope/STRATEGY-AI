import { STATS } from "@/lib/content";

export default function StatsStrip() {
  return (
    <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto pb-12 md:pb-20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="glass-panel glass-panel-glow rounded-xl px-3 py-6 md:px-6 md:py-8 text-center min-w-0"
          >
            <p className="font-mono text-2xl md:text-4xl font-bold text-primary-fixed tracking-tight">
              {stat.value}
            </p>
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant mt-3">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
