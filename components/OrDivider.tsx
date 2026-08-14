/** Horizontal rule with a centred label, used between the password form and OAuth. */
export default function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-4" role="separator">
      <span className="h-px flex-grow bg-outline-variant/40" />
      <span className="text-label-md text-on-surface-variant uppercase tracking-widest">
        {label}
      </span>
      <span className="h-px flex-grow bg-outline-variant/40" />
    </div>
  );
}
