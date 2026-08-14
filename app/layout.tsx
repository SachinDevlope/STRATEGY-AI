import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Strategy-AI — Free AI Resume Builder & Live AI Mock Interview",
  description:
    "Build ATS-friendly resumes, tailor them to any job description, and practice with a live AI mock interviewer that asks role-specific questions and follows up in real time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable} ${hankenGrotesk.variable}`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="text-on-surface font-body-md antialiased min-h-screen flex flex-col scan-lines relative overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container"
      >
        {/* Blueprint grid sits behind everything. */}
        <div
          className="fixed inset-0 grid-bg pointer-events-none z-[-1]"
          aria-hidden="true"
        />
        {children}
      </body>
    </html>
  );
}
