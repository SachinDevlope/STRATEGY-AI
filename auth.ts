import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { getClientPromise } from "@/lib/mongodb";
import { authConfig } from "@/auth.config";
import { claimAccountWithGoogle, getUserByEmail, verifyPassword } from "@/lib/users";

/**
 * Full Auth.js config (edge-safe base + MongoDB).
 * Node.js only — never import from middleware.ts.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    // Lives here, not in auth.config.ts, because authorize() needs MongoDB.
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
        // Same null for "no password" and "wrong password" — no email probing.
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
  events: {
    // Google proves who owns the email. Drop any password set before that,
    // so nobody can pre-register someone else's address and keep access.
    async linkAccount({ user, account }) {
      if (account.provider === "google" && user.id) {
        await claimAccountWithGoogle(user.id);
      }
    },
  },
  adapter: MongoDBAdapter(getClientPromise, {
    // Prefixed so the adapter never touches the older "users" collection in Gen-Ai.
    collections: {
      Users: "auth_users",
      Accounts: "auth_accounts",
      Sessions: "auth_sessions",
      VerificationTokens: "auth_verification_tokens",
    },
  }),
});
