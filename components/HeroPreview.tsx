import { BRAND_ICON, BRAND_NAME } from "@/lib/brand";

// Coded product preview for the hero: our own UI, sharp at any size, no stock image.
const NAV = ["Dashboard", "Resume", "Interview", "STAR"];
const MATCHED = ["Go", "Kafka", "System design"];
const MISSING = ["Kubernetes"];
// Bar heights (%) for the voice waveform.
const WAVE = [30, 55, 80, 45, 95, 60, 35, 70, 100, 50, 75, 40, 85, 55, 30, 65, 90, 45, 60, 35];

export default function HeroPreview() {
  return (
    <div
      role="img"
      aria-label="Strategy-AI app preview: a tailored resume with matched keywords next to a live AI mock interview answered by voice."
      className="w-full h-full flex flex-col bg-surface-container-lowest/80 text-left"
    >
      <div aria-hidden className="flex flex-col h-full">
        {/* App bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/40">
          <span className="material-symbols-outlined text-primary-container text-[20px]">{BRAND_ICON}</span>
          <span className="font-display font-bold text-on-surface text-[15px] whitespace-nowrap">{BRAND_NAME}</span>
          <div className="hidden sm:flex lg:hidden xl:flex gap-1 ml-auto">
            {NAV.map((item) => (
              <span
                key={item}
                className={`px-2.5 py-1 rounded text-[11px] ${
                  item === "Interview"
                    ? "bg-primary-container/15 text-primary-fixed"
                    : "text-on-surface-variant/70"
                }`}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Side by side only when the panel is wide; extra bottom padding keeps the floating ATS card off the content. */}
        <div className="grid grid-cols-1 sm:grid-cols-5 lg:grid-cols-1 xl:grid-cols-5 gap-3 p-3 pb-16 sm:p-4 sm:pb-16 flex-1 min-h-0">
          {/* Resume */}
          <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2 rounded-lg border border-outline-variant/40 bg-surface-container-low p-3 flex flex-col gap-2.5 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">Resume</span>
              <span className="text-[10px] text-primary-fixed">Tailored</span>
            </div>
            <div>
              <div className="text-[13px] font-bold text-on-surface">Aarav Sharma</div>
              <div className="text-[11px] text-on-surface-variant">Senior Backend Engineer</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 rounded-full bg-outline-variant/50 w-full" />
              <div className="h-1.5 rounded-full bg-outline-variant/50 w-11/12" />
              <div className="h-1.5 rounded-full bg-primary-container/40 w-4/5" />
              <div className="h-1.5 rounded-full bg-outline-variant/50 w-3/4" />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {MATCHED.map((k) => (
                <span key={k} className="px-2 py-0.5 rounded-full text-[10px] border border-primary-container/40 text-primary-fixed bg-primary-container/10">
                  ✓ {k}
                </span>
              ))}
              {MISSING.map((k) => (
                <span key={k} className="px-2 py-0.5 rounded-full text-[10px] border border-outline-variant/60 text-on-surface-variant">
                  {k}
                </span>
              ))}
            </div>
          </div>

          {/* Mock interview */}
          <div className="sm:col-span-3 lg:col-span-1 xl:col-span-3 rounded-lg border border-outline-variant/40 bg-surface-container-low p-3 flex flex-col gap-3 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">
                Live mock interview
              </span>
              <span className="flex items-center gap-1 text-[10px] text-error">
                <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                Listening
              </span>
            </div>

            <div className="flex gap-2 items-start">
              <span className="material-symbols-outlined text-primary-container text-[18px] shrink-0">smart_toy</span>
              <p className="text-[12px] leading-snug text-on-surface rounded-lg rounded-tl-none bg-surface-container-high px-3 py-2">
                You cut p99 latency by 40%. What did you measure first, and why?
              </p>
            </div>

            <div className="flex items-center justify-between h-10 px-1">
              {WAVE.map((height, i) => (
                <span
                  key={i}
                  className="hero-wave-bar w-1 sm:w-1.5 rounded-full bg-gradient-to-t from-primary-container/40 to-primary-fixed"
                  style={{ height: `${height}%`, animationDelay: `${(i % 7) * 0.12}s` }}
                />
              ))}
            </div>

            <p className="text-[11px] text-on-surface-variant italic truncate">
              “I started with tracing on the order service and found the slow Kafka consumer…”
            </p>

            <div className="grid grid-cols-3 gap-2 mt-auto">
              {[
                ["Clarity", "8/10"],
                ["Depth", "7/10"],
                ["STAR", "9/10"],
              ].map(([label, score]) => (
                <div key={label} className="rounded border border-outline-variant/40 px-2 py-1.5">
                  <div className="text-[9px] uppercase tracking-[0.08em] text-on-surface-variant">{label}</div>
                  <div className="font-mono text-[13px] text-on-surface">{score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
