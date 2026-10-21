import type { ReactNode } from "react";

export type LoadingMeta = {
  label: string;
  value: ReactNode;
  /** Show the value in the cyan accent. */
  highlight?: boolean;
};

// Shared footer rows. Kept out of the client component so server
// loading.tsx files get the real array.
export const BASE_META: LoadingMeta[] = [
  { label: "Version", value: "8.0.29-AI" },
  { label: "Region", value: "Global AI Hub" },
];
