"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { BRAND_NAME } from "@/lib/brand";
import { BASE_META } from "@/lib/loading";
import { lockBodyScroll } from "@/lib/scroll-lock";

/** Below this the loader would flash rather than read as a loading screen. */
const MIN_VISIBLE_MS = 900;
/** Matches the fade-out duration in the className below. */
const FADE_MS = 400;

/**
 * The boot screen. Rendered in the root layout, so it is part of the server
 * HTML and covers the page from the very first paint until fonts, styles and
 * hydration have all landed — the window that would otherwise show unstyled
 * or half-drawn content.
 */
export default function SiteLoader() {
  // Starts visible on the server too, so there is no gap before hydration.
  const [phase, setPhase] = useState<"visible" | "fading" | "gone">("visible");

  // Runs once on mount. It must not depend on `phase`: setting "fading"
  // would re-run it, and the cleanup would clear the very timer that takes
  // the loader to "gone" — leaving the page permanently unscrollable.
  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout>;
    let goneTimer: ReturnType<typeof setTimeout>;
    const startedAt = performance.now();

    function begin() {
      // Whichever is later: the page being ready, or the minimum on-screen
      // time. Without the floor a warm cache makes it blink.
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

  // Nothing behind the loader should scroll while it is up.
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
