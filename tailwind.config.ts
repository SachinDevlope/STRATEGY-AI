import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "on-tertiary-container": "#002e3f",
        "on-tertiary": "#073446",
        "inverse-primary": "#30618f",
        "tertiary-fixed": "#c1e8ff",
        "error-container": "#93000a",
        "inverse-surface": "#d5e3ff",
        "on-tertiary-fixed": "#001e2b",
        outline: "#8c919a",
        "primary-fixed-dim": "#00dbe9",
        "secondary-container": "#264b71",
        "on-secondary-container": "#98bbe7",
        "on-secondary-fixed-variant": "#23496e",
        "on-secondary-fixed": "#001d36",
        "surface-container": "#122034",
        "surface-bright": "#2c3a4f",
        primary: "#9ccafe",
        "on-primary-container": "#00363a",
        "surface-container-highest": "#27354b",
        "on-primary-fixed-variant": "#0f4976",
        "surface-container-lowest": "#010e22",
        "tertiary-container": "#7096ab",
        error: "#ffb4ab",
        "on-tertiary-fixed-variant": "#244b5e",
        "secondary-fixed": "#d1e4ff",
        "inverse-on-surface": "#233146",
        "surface-container-low": "#0d1c30",
        "surface-dim": "#051428",
        // Cyan accent drives every CTA / glow in the cyber-glass theme.
        "primary-fixed": "#7df4ff",
        secondary: "#a6c9f5",
        "on-error": "#690005",
        "on-secondary": "#043256",
        "primary-container": "#00f0ff",
        "surface-tint": "#9ccafe",
        "tertiary-fixed-dim": "#a5cce2",
        "on-primary": "#003256",
        "surface-variant": "#27354b",
        "on-surface": "#d5e3ff",
        "on-surface-variant": "#c2c7d0",
        "on-primary-fixed": "#001d35",
        "secondary-fixed-dim": "#a6c9f5",
        "surface-container-high": "#1c2a3f",
        "outline-variant": "#42474f",
        "on-background": "#d5e3ff",
        "on-error-container": "#ffdad6",
        background: "#051428",
        surface: "#051428",
        tertiary: "#a5cce2",
        // Warm accent used by ratings / "Wall of Love".
        accent: "#e8a33d",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        "margin-desktop": "64px",
        "margin-mobile": "16px",
        "container-max": "1280px",
        gutter: "24px",
        unit: "8px",
      },
      maxWidth: {
        "container-max": "1280px",
      },
      fontFamily: {
        "body-sm": ["var(--font-inter)", "Inter", "sans-serif"],
        "label-md": ["var(--font-inter)", "Inter", "sans-serif"],
        "body-md": ["var(--font-inter)", "Inter", "sans-serif"],
        // Display / headline sizes use the geometric grotesk.
        "headline-xl": ["var(--font-display)", "Hanken Grotesk", "sans-serif"],
        "headline-lg-mobile": [
          "var(--font-display)",
          "Hanken Grotesk",
          "sans-serif",
        ],
        "headline-lg": ["var(--font-display)", "Hanken Grotesk", "sans-serif"],
        display: ["var(--font-display)", "Hanken Grotesk", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
        // Uppercase micro-labels are tabular mono, like the reference.
        "label-caps": ["var(--font-mono)", "JetBrains Mono", "monospace"],
        "data-tabular": ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      fontSize: {
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-md": [
          "12px",
          { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" },
        ],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-xl": [
          "48px",
          { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "headline-lg-mobile": ["28px", { lineHeight: "36px", fontWeight: "600" }],
        "headline-lg": [
          "32px",
          { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "label-caps": [
          "12px",
          { lineHeight: "16px", letterSpacing: "0.1em", fontWeight: "500" },
        ],
        "data-tabular": ["14px", { lineHeight: "20px", fontWeight: "400" }],
      },
      animation: {
        marquee: "marquee-scroll 40s linear infinite",
      },
      keyframes: {
        "marquee-scroll": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
