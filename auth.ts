import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { getClientPromise } from "@/lib/mongodb";
import { authConfig } from "@/auth.config";

/**
 * Full Auth.js config: the edge-safe base plus the MongoDB adapter.
 * Import this from route handlers and Server Components, never from
 * middleware.ts — the MongoDB driver is not Edge-compatible.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
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
