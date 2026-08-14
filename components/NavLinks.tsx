"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/#resume", section: "resume", label: "Resume Builder" },
  { href: "/#features", section: "features", label: "AI Interviewer" },
  { href: "/#star", section: "star", label: "STAR Method" },
  { href: "/#stories", section: "stories", label: "Success Stories" },
];

const BASE =
  "h-20 flex items-center px-2 hover:bg-primary-container/5 rounded-lg transition-all duration-200";
const ACTIVE =
  "text-primary-fixed font-semibold border-b-2 border-primary-container";
const IDLE =
  "text-on-surface-variant hover:text-primary-fixed border-b-2 border-transparent";

export default function NavLinks() {
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    // Sections only exist on the landing page.
    if (pathname !== "/") {
      setActive(null);
      return;
    }

    const targets = LINKS.map((link) =>
      document.getElementById(link.section)
    ).filter((el): el is HTMLElement => el !== null);

    if (targets.length === 0) return;

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Highlight the highest section currently in view.
        const current = LINKS.map((link) => link.section).find((id) =>
          visible.has(id)
        );
        setActive(current ?? null);
      },
      // Band just under the fixed nav, so a section counts as "active"
      // only once it reaches the upper part of the viewport.
      { rootMargin: "-104px 0px -55% 0px", threshold: 0 }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <div className="hidden md:flex items-center gap-6">
      {LINKS.map((link) => {
        const isActive = pathname === "/" && active === link.section;
        return (
          <Link
            key={link.label}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`${BASE} ${isActive ? ACTIVE : IDLE}`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
