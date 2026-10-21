"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { BRAND_NAME } from "@/lib/brand";
import { BASE_META } from "@/lib/loading";
import { lockBodyScroll } from "@/lib/scroll-lock";

// Shorter than this and the loader just flashes.
const MIN_VISIBLE_MS = 900;
// Must match the fade duration in the className below.
const FADE_MS = 400;

/** Boot screen in the root layout; hides the page until it has fully loaded. */
export default function SiteLoader() {
  // Visible from server render, so there's no gap before hydration.
  const [phase, setPhase] = useState<"visible" | "fading" | "gone">("visible");

  // Run once only. Depending on `phase` would clear the "gone" timer and
  // leave the page stuck unscrollable.
  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout>;
    let goneTimer: ReturnType<typeof setTimeout>;
    const startedAt = performance.now();

    function begin() {
      // Wait for page load and the minimum time, whichever is later.
      const waited = performance.now() - startedAt;
      fadeTimer = setTimeout(() => {
        setPhase("fading");
        goneTimer = setTimeout(() => setPhase("gone"), FADE_MS);
      }, Math.max(0, MIN_VISIBLE_MS - waited));
    }

    if (document.readyState === "complete") {
      begin();
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(goneTimer);
      };
    }

    window.addEventListener("load", begin, { once: true });
    return () => {
      window.removeEventListener("load", begin);
      clearTimeout(fadeTimer);
      clearTimeout(goneTimer);
    };
  }, []);

  useEffect(() => {
    if (phase === "gone") return;
    return lockBodyScroll();
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      data-site-loader=""
      aria-hidden={phase === "fading"}
      className={`fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-background px-margin-mobile md:px-margin-desktop py-10 transition-opacity duration-[400ms] ease-out ${
        phase === "fading" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <LoadingScreen
        node={BRAND_NAME}
        icon="neurology"
        heading="Starting Strategy-AI"
        message="Warming up the resume engine and the interview models."
        status="Booting"
        meta={[
          ...BASE_META,
          { label: "Type", value: "Neural Processing" },
          { label: "Session", value: "Secure", highlight: true },
        ]}
      />
    </div>
  );
}
