import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Built from the edge-safe config only — importing "@/auth" here would pull the
// MongoDB driver into the Edge runtime and fail at request time.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  // Skip static assets and the auth API routes themselves.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
