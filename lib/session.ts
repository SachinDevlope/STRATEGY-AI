import { auth } from "@/auth";

/** The signed-in user's id, or null. Use where "not signed in" is a normal case. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * The signed-in user's id, or a thrown error. Server actions are only reachable
 * from pages the middleware already guards, so an anonymous call is a bug
 * rather than a state worth rendering.
 */
export async function requireUserId(): Promise<string> {
  const id = await currentUserId();
  if (!id) throw new Error("Not signed in.");
  return id;
}
