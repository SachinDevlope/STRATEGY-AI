"use client";

import { useEffect, useRef } from "react";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { BASE_META, type LoadingMeta } from "@/lib/loading";
import { BRAND_ICON } from "@/lib/brand";

export type { LoadingMeta };

export type LoadingStep = {
  label: string;
  /** "done" ticks, "active" spins, "waiting" stays dim. */
  state: "done" | "active" | "waiting";
};

export type LoadingScreenProps = {
  /** Card header title. */
  node?: string;
  /** Material Symbols name. */
  nodeIcon?: string;
  /** Header pill. Off by default. */
  badge?: string | null;
  heading?: string;
  message?: string;
  /** Material Symbols name. */
  icon?: string;
  status?: string;
  /** Pass [] to hide the footer. */
  meta?: LoadingMeta[];
  steps?: LoadingStep[];
  /** 0–100. Omit to show a sweeping bar instead of a fake percentage. */
  progress?: number;
};

const DEFAULT_HEADING = "Your analysis is being prepared";

const DEFAULT_META: LoadingMeta[] = [
  ...BASE_META,
  { label: "Type", value: "Neural Processing" },
  { label: "Backups", value: "Active Stream", highlight: true },
];

/** Loading card for slow work (API calls, AI runs, route changes). */
export default function LoadingScreen({
  node = "Analysis Node Alpha",
  nodeIcon = BRAND_ICON,
  badge = null,
  heading = DEFAULT_HEADING,
  message = "New analysis typically takes between 1–3 minutes to complete. We are optimising neural pathways.",
  icon = "cloud_upload",
  status = "Provisioning",
  meta = DEFAULT_META,
  steps,
  progress,
}: LoadingScreenProps) {
  const measured = typeof progress === "number";
  const percent = clamp(progress);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="loading-sweep relative w-full max-w-3xl glass-panel rounded-xl shadow-[0_4px_40px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/5 bg-surface-container-high/40">
        <div className="flex items-center gap-3 min-w-0">
          <span
            aria-hidden
            className="material-symbols-outlined text-primary-container text-[20px]"
          >
            {nodeIcon}
          </span>
          <span className="font-label-caps text-label-caps uppercase text-primary-container truncate">
            {node}
          </span>
        </div>
        {badge && (
          <span className="shrink-0 px-3 py-1 bg-surface-container-lowest text-primary-container border border-primary-container/30 rounded-full font-label-caps text-label-caps tracking-widest">
            {badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="relative flex flex-col items-center text-center gap-5 px-6 py-12 md:py-16">
        <div
          aria-hidden
          className="absolute top-10 w-56 h-56 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"
        />

        <div className="relative z-10 flex flex-col items-center gap-5 w-full">
          <div className="relative">
            <span
              aria-hidden
              className="material-symbols-outlined text-on-surface-variant/70 text-[72px] leading-none"
            >
              {icon}
            </span>
            <span className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 shadow-lg">
              <span className="bg-primary-container text-on-primary w-9 h-9 rounded-full flex items-center justify-center glow-pulse">
                <span
                  aria-hidden
                  className="material-symbols-outlined animate-spin-slow text-[20px]"
                >
                  autorenew
                </span>
              </span>
            </span>
          </div>

          <div className="flex flex-col gap-2 max-w-md">
            <h2 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface">
              {heading}
            </h2>
            <p className="text-body-sm md:text-body-md text-on-surface-variant">
              {message}
            </p>
          </div>

          {/* Sweeps when progress is unknown; a static bar looks frozen. */}
          <div className="w-full max-w-sm flex flex-col gap-2">
            <div className="h-1 rounded-full bg-outline-variant/40 overflow-hidden">
              <div
                className={`h-full bg-primary-container rounded-full ${
                  measured ? "transition-all duration-300" : "loading-bar-indeterminate"
                }`}
                {...(measured ? { style: { width: `${percent}%` } } : {})}
              />
            </div>
            {measured && (
              <span className="font-mono text-data-tabular text-on-surface-variant self-end">
                {Math.round(percent)}%
              </span>
            )}
          </div>

          {steps && steps.length > 0 && (
            <ul className="w-full max-w-sm flex flex-col gap-2 mt-2 text-left">
              {steps.map((step) => (
                <li
                  key={step.label}
                  className={`flex items-center gap-3 text-body-sm ${
                    step.state === "waiting"
                      ? "text-on-surface-variant/40"
                      : "text-on-surface"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`material-symbols-outlined text-[18px] ${
                      step.state === "done"
                        ? "text-primary-container"
                        : step.state === "active"
                          ? "text-primary-container animate-spin-slow"
                          : "text-on-surface-variant/40"
                    }`}
                  >
                    {step.state === "done"
                      ? "check_circle"
                      : step.state === "active"
                        ? "autorenew"
                        : "radio_button_unchecked"}
                  </span>
                  {step.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Footer */}
      {meta.length > 0 && (
        <div className="px-6 py-4 bg-surface-container-high/30 border-t border-white/5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4">
          {meta.map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5 min-w-0">
              <span className="font-label-caps text-label-caps text-on-surface-variant/70 uppercase">
                {row.label}
              </span>
              <span
                className={`font-mono text-data-tabular truncate ${
                  row.highlight ? "text-primary-fixed-dim" : "text-on-surface"
                }`}
                title={typeof row.value === "string" ? row.value : undefined}
              >
                {row.value}
              </span>
            </div>
          ))}
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-label-caps text-label-caps text-on-surface-variant/70 uppercase">
              Status
            </span>
            <span className="font-mono text-data-tabular text-primary-container flex items-center gap-2">
              <span
                aria-hidden
                className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse shrink-0"
              />
              <span className="truncate">{status}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Full-screen overlay version, for client actions that block the page. */
export function LoadingOverlay(props: LoadingScreenProps) {
  // Stop the page behind from scrolling.
  useEffect(() => lockBodyScroll(), []);

  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => dialogRef.current?.focus(), []);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={props.heading ?? DEFAULT_HEADING}
      tabIndex={-1}
      className="fixed inset-0 outline-none z-[100] flex items-center justify-center overflow-y-auto bg-background/85 backdrop-blur-md px-margin-mobile md:px-margin-desktop py-10"
    >
      <LoadingScreen {...props} />
    </div>
  );
}

/** Route version for loading.tsx; pads for the fixed navbar. */
export function LoadingPage(props: LoadingScreenProps) {
  return (
    <main className="flex-grow pt-[104px] pb-16 px-margin-mobile md:px-margin-desktop flex items-start md:items-center justify-center min-h-[70vh]">
      <LoadingScreen {...props} />
    </main>
  );
}

function clamp(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
