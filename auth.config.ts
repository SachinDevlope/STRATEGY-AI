import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe half of the Auth.js config.
 *
 * middleware.ts runs on the Edge runtime, where the MongoDB driver cannot run.
 * Everything the middleware needs (providers, pages, the authorized callback)
 * lives here; the database adapter is added in auth.ts, which only runs in
 * Node.js route handlers and Server Components.
 */
/**
 * The one origin Google will accept as a redirect target.
 *
 * Auth.js derives the OAuth redirect_uri from the incoming request host unless
 * AUTH_URL is set. Every Vercel deployment answers on a unique per-push hostname
 * (strategy-k0bwi5vi3-....vercel.app) alongside the stable domain, and only the
 * stable one is registered in the Google Cloud Console — so a sign-in started
 * from a deployment-specific URL dies with redirect_uri_mismatch.
 *
 * This is written out rather than read from VERCEL_PROJECT_PRODUCTION_URL
 * because that variable only exists when the project has "Automatically expose
 * System Environment Variables" enabled; relying on it makes the fix silently
 * depend on a dashboard toggle. Set AUTH_URL to override, e.g. when a custom
 * domain replaces this one — then register that domain with Google too.
 */
const PRODUCTION_ORIGIN = "https://strategy-ai-lac.vercel.app";

// Left alone in development so `next dev` keeps signing in against localhost.
if (!process.env.AUTH_URL && process.env.NODE_ENV === "production") {
  process.env.AUTH_URL = PRODUCTION_ORIGIN;
}

export const authConfig = {
  // Vercel terminates TLS upstream, so the forwarded host/proto headers are the
  // only source of truth for the callback URL.
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Someone who signed up with a password and later clicks "Continue with
      // Google" on the same address should land in the same account instead of
      // hitting OAuthAccountNotLinked. Safe here only because Google returns a
      // verified email — do not copy this onto a provider that does not.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    // JWT sessions so the middleware can authorize on the Edge without a
    // database round trip. The adapter still persists users and accounts.
    strategy: "jwt",
  },
  callbacks: {
    // Anything under /dashboard requires a signed-in user.
    authorized({ auth, request }) {
      const isProtected = request.nextUrl.pathname.startsWith("/dashboard");
      if (!isProtected) return true;
      return Boolean(auth?.user);
    },
    // With the JWT strategy the user id is not on the session by default.
    // Copy it onto the token at sign-in so features can scope data per user.
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
