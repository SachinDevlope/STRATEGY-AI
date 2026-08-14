"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/actions/auth";
import UserBadge from "@/components/UserBadge";
import { SECTION_LINKS } from "@/lib/nav";

/**
 * Signed-in navigation. Once there is an account the top bar drops the marketing
 * links and puts everything — the sections, the dashboard, sign-out — behind the
 * profile button, so the bar stays short whatever the name length.
 */
export default function UserMenu({
  name,
  email,
  image,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // A navigation inside the menu leaves it open behind the new page otherwise.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border border-outline-variant/40 bg-surface-container-low/60 hover:border-primary-container/50 transition-colors"
      >
        <UserBadge name={name} email={email} image={image} />
        <span
          aria-hidden
          className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-outline-variant/40 bg-surface-container-low shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col py-1.5"
        >
          <span className="px-4 py-2 text-body-sm text-on-surface-variant/70 truncate border-b border-outline-variant/30 mb-1.5">
            {email ?? name}
          </span>

          <MenuLink href="/dashboard" icon="space_dashboard" label="Dashboard" />

          {SECTION_LINKS.map((link) => (
            <MenuLink
              key={link.href}
              href={link.href}
              icon={ICONS[link.section]}
              label={link.label}
            />
          ))}

          <form action={signOutAction} className="border-t border-outline-variant/30 mt-1.5 pt-1.5">
            <button
              type="submit"
              role="menuitem"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-body-md text-on-surface-variant hover:bg-primary-container/5 hover:text-primary-fixed transition-colors"
            >
              <span aria-hidden className="material-symbols-outlined text-[18px]">
                logout
              </span>
              Log Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const ICONS: Record<string, string> = {
  resume: "description",
  features: "neurology",
  star: "auto_awesome",
};

function MenuLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-3 px-4 py-2.5 text-body-md text-on-surface-variant hover:bg-primary-container/5 hover:text-primary-fixed transition-colors"
    >
      <span aria-hidden className="material-symbols-outlined text-[18px]">
        {icon}
      </span>
      {label}
    </Link>
  );
}
