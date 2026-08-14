import type { ReactNode } from "react";

export type LoadingMeta = {
  label: string;
  value: ReactNode;
  /** Renders the value in the cyan accent — use for the live/active row. */
  highlight?: boolean;
};

/**
 * Rows every loading screen carries; callers spread this and append their own.
 * Lives outside the client component so server components (loading.tsx files)
 * import the real array rather than a client-reference proxy.
 */
export const BASE_META: LoadingMeta[] = [
  { label: "Version", value: "8.0.29-AI" },
  { label: "Region", value: "Global AI Hub" },
];
