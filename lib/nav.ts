/**
 * The landing page's section links. Shared by the top nav (signed out) and the
 * profile menu (signed in) so the two can never list different things.
 */
export const SECTION_LINKS = [
  { href: "/#resume", section: "resume", label: "Resume Builder" },
  { href: "/#features", section: "features", label: "AI Interviewer" },
  { href: "/#star", section: "star", label: "STAR Method" },
] as const;
