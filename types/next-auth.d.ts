import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** How this session signed in: "google" or "credentials". */
      provider?: string;
    } & DefaultSession["user"];
  }
}
