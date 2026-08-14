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
// Every Vercel deployment also gets a unique hostname
// (strategy-k0bwi5vi3-....vercel.app) that changes on each push. If Auth.js
// derives the OAuth callback from that host, Google rejects it as an
// unregistered redirect_uri, because only the stable domain can realistically be
// whitelisted in the Cloud Console. VERCEL_PROJECT_PRODUCTION_URL is injected by
// Vercel on every deployment and always holds the stable production hostname, so
// pin AUTH_URL to it unless one was configured explicitly. Undefined locally,
// where Auth.js correctly falls back to the request host.
if (!process.env.AUTH_URL && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  process.env.AUTH_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
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
