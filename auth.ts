import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { getClientPromise } from "@/lib/mongodb";
import { authConfig } from "@/auth.config";
import { getUserByEmail, verifyPassword } from "@/lib/users";

/**
 * Full Auth.js config: the edge-safe base plus the MongoDB adapter.
 * Import this from route handlers and Server Components, never from
 * middleware.ts — the MongoDB driver is not Edge-compatible.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    // Email + password. Declared here rather than in auth.config.ts because
    // authorize() touches MongoDB, and auth.config.ts is imported by the Edge
    // middleware. The middleware only verifies an already-issued JWT, so it does
    // not need to know this provider exists.
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const email = typeof raw.email === "string" ? raw.email : "";
        const password = typeof raw.password === "string" ? raw.password : "";
        if (!email || !password) return null;

        const user = await getUserByEmail(email);
        // No hash means the account was created through Google. Returning null
        // (not a distinct error) keeps this from confirming which emails exist.
        if (!user?.passwordHash) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;

        return {
          id: user._id.toHexString(),
          name: user.name ?? null,
          email: user.email,
          image: user.image ?? null,
        };
      },
    }),
  ],
  adapter: MongoDBAdapter(getClientPromise, {
    // The Gen-Ai database already holds a "users" collection from an earlier
    // app with a different schema. Namespace the Auth.js collections so the
    // adapter never writes into it.
    collections: {
      Users: "auth_users",
      Accounts: "auth_accounts",
      Sessions: "auth_sessions",
      VerificationTokens: "auth_verification_tokens",
    },
  }),
});
