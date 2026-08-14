import Link from "next/link";
import Logo from "@/components/Logo";

const COLUMNS = [
  {
    heading: "Platform",
    links: [
      { label: "Resume Builder", href: "/#resume" },
      { label: "Features", href: "/#features" },
      { label: "Success Stories", href: "/#stories" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Contact Support", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-surface-container-lowest w-full border-t border-white/5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-margin-mobile md:px-margin-desktop py-12 max-w-container-max mx-auto">
        <div className="flex flex-col gap-4 col-span-1 md:col-span-2">
          <Logo
            className="font-display text-headline-lg font-bold text-on-surface"
            iconClassName="text-[24px]"
          />
          <p className="text-body-sm text-on-surface-variant">
            © {new Date().getFullYear()} Strategy-AI. All rights reserved.
            Precision-grade career tools for ambitious professionals.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.heading} className="flex flex-col gap-4">
            <h4 className="font-label-caps text-label-caps uppercase text-on-surface">
              {column.heading}
            </h4>
            {column.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-body-sm text-on-surface-variant hover:text-primary-fixed transition-colors opacity-80 hover:opacity-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </footer>
  );
}
