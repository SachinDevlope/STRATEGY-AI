"use server";

import { signOut } from "@/auth";

/** Sign-out as a standalone action, so client components can post to it. */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
