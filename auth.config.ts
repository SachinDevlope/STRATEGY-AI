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
export const authConfig = {
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
