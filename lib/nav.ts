// Landing page section links, shared by the top nav and the profile menu.
export const SECTION_LINKS = [
  { href: "/#resume", section: "resume", label: "Resume Builder" },
  { href: "/#features", section: "features", label: "Features" },
  { href: "/#star", section: "star", label: "STAR Method" },
] as const;

// App pages, shown in the signed-in profile menu.
export const APP_LINKS = [
  { href: "/dashboard/resume/new", icon: "description", label: "Build resume" },
  { href: "/dashboard/resume/analyze", icon: "adjust", label: "Analyse resume" },
  { href: "/dashboard/interview", icon: "mic", label: "Mock interview" },
  { href: "/dashboard/star", icon: "auto_awesome", label: "STAR builder" },
] as const;
