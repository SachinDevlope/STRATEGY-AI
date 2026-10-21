import Image from "next/image";

/** Initials for the placeholder — the email's local part if there is no name. */
function initials(name: string | null | undefined, email: string | null | undefined) {
  const source = name?.trim() || email?.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]);
  return letters.join("").toUpperCase() || "?";
}

/** Avatar plus name. Falls back to initials when there's no photo. */
export default function UserBadge({
  name,
  email,
  image,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}) {
  const label = name?.trim() || email || "Your account";

  return (
    <span className="flex items-center gap-2.5 min-w-0" title={email ?? undefined}>
      {image ? (
        <Image
          src={image}
          alt=""
          width={32}
          height={32}
          className="w-8 h-8 rounded-full object-cover border border-outline-variant/60 shrink-0"
        />
      ) : (
        <span
          aria-hidden
          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-primary-container/15 border border-primary-container/40 text-primary-fixed font-label-caps text-label-caps"
        >
          {initials(name, email)}
        </span>
      )}
      <span className="hidden md:block text-body-sm text-on-surface truncate max-w-[140px]">
        {label}
      </span>
    </span>
  );
}
