"use client";

import { useState } from "react";
import { COMPANIES, type Company } from "@/lib/content";

function LogoCard({ company }: { company: Company }) {
  // Simple Icons has no mark for every brand — fall back to the site favicon.
  const [failed, setFailed] = useState(false);

  const src = failed
    ? `https://www.google.com/s2/favicons?sz=64&domain=${company.domain}`
    : `https://cdn.simpleicons.org/${company.slug}/d5e3ff`;

  return (
    <div className="logo-card glass-panel glass-panel-glow flex items-center gap-3 shrink-0 whitespace-nowrap rounded-xl px-5 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={24}
        height={24}
        loading="lazy"
        className="w-6 h-6 object-contain"
        onError={() => setFailed(true)}
      />
      <span className="text-body-md font-bold text-on-surface">
        {company.name}
      </span>
    </div>
  );
}

function LogoSet({ hidden }: { hidden?: boolean }) {
  return (
    <div
      className="flex items-center gap-4 md:gap-6 pr-4 md:pr-6 shrink-0"
      aria-hidden={hidden}
    >
      {COMPANIES.map((company) => (
        <LogoCard key={company.name} company={company} />
      ))}
    </div>
  );
}

export default function LogoMarquee() {
  return (
    <section className="bg-surface-container-low py-8 border-y border-white/5">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto flex flex-col items-center gap-6">
        <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">
          Trusted by candidates hired at
        </p>
      </div>

      {/* Scrolls continuously; pauses on hover or keyboard focus. */}
      <div className="marquee mt-6">
        <div className="marquee-track">
          <LogoSet />
          {/* Duplicate set makes the -50% translate loop seamlessly. */}
          <LogoSet hidden />
        </div>
      </div>
    </section>
  );
}
