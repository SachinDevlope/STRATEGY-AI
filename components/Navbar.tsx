import Link from "next/link";
import { auth } from "@/auth";
import NavLinks from "@/components/NavLinks";
import Logo from "@/components/Logo";
import UserMenu from "@/components/UserMenu";

export default async function Navbar() {
  const session = await auth();
  const user = session?.user;

  return (
    <nav className="bg-surface/80 backdrop-blur-md fixed top-0 w-full border-b border-white/10 shadow-sm z-50">
      <div className="flex justify-between items-center h-20 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <Logo />

        {/* Signed in, the section links move into the profile menu — the bar
            stops being a marketing nav once there is an account behind it. */}
        {user ? <span /> : <NavLinks />}

        <div className="flex items-center gap-4">
          {user ? (
            <UserMenu name={user.name} email={user.email} image={user.image} />
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
