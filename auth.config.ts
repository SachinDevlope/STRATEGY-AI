import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe half of the Auth.js config, used by middleware.ts.
 * No database code here — auth.ts adds MongoDB for Node.js.
 */

/**
 * Only this origin is registered with Google. Production pins AUTH_URL to it,
 * so sign-ins from per-deploy hostnames still use a valid redirect_uri.
 * Set AUTH_URL to override (e.g. a custom domain).
 */
const PRODUCTION_ORIGIN = "https://strategy-ai-lac.vercel.app";

// Previews keep their own host so password login works there.
// Google login on previews needs that host registered with Google.
const isPreview = process.env.VERCEL_ENV === "preview";

if (!process.env.AUTH_URL && process.env.NODE_ENV === "production" && !isPreview) {
  process.env.AUTH_URL = PRODUCTION_ORIGIN;
}

export const authConfig = {
  // Behind Vercel's proxy, trust the forwarded host/proto headers.
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Same email = same account. Safe only because Google verifies emails;
      // auth.ts removes any unverified password when this links.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    // JWT so middleware can check auth without a DB call.
    strategy: "jwt",
  },
  callbacks: {
    // /dashboard/* needs a signed-in user.
    authorized({ auth, request }) {
      const isProtected = request.nextUrl.pathname.startsWith("/dashboard");
      if (!isProtected) return true;
      return Boolean(auth?.user);
    },
    // Copy user id and sign-in method onto the token at sign-in.
    jwt({ token, user, account }) {
      if (user) token.id = user.id;
      if (account) token.provider = account.provider;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
        session.user.provider = token.provider as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
