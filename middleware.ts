import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Use the edge-safe config only; "@/auth" pulls in MongoDB, which breaks on Edge.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  // Skip static assets and the auth API routes themselves.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
