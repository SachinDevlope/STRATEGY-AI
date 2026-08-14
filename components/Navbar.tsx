import Link from "next/link";
import { auth, signOut } from "@/auth";
import NavLinks from "@/components/NavLinks";

export default async function Navbar() {
  const session = await auth();

  return (
    <nav className="bg-surface/80 backdrop-blur-md fixed top-0 w-full border-b border-white/10 shadow-sm z-50">
      <div className="flex justify-between items-center h-20 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <Link
          href="/"
          className="font-display text-headline-lg font-bold tracking-tight text-on-surface flex items-center gap-2"
        >
          <span
            className="material-symbols-outlined text-primary-container"
            aria-hidden="true"
          >
            document_scanner
          </span>
          Strategy-AI
        </Link>

        <NavLinks />

        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              <span className="hidden md:inline-block font-body-sm text-body-sm text-on-surface-variant">
                {session.user.name ?? session.user.email}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="hidden md:inline-block font-body-md text-on-surface-variant hover:text-primary-fixed transition-colors"
                >
                  Log Out
                </button>
              </form>
              <Link
                href="/dashboard"
                className="bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase py-2.5 px-6 rounded btn-glow transition-all duration-300 flex items-center gap-2"
              >
                Dashboard
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden md:inline-block font-body-md text-on-surface-variant hover:text-primary-fixed transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase py-2.5 px-6 rounded btn-glow transition-all duration-300 flex items-center gap-2"
              >
                Build Resume
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
