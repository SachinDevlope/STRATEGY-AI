import { auth } from "@/auth";
import { UserError } from "@/lib/errors";
import { getUserById } from "@/lib/users";

/** Signed-in user's id, or null. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  // A password session dies once the password is removed (see auth.ts linkAccount).
  // Tokens from before `provider` existed are checked too.
  if (session.user.provider !== "google") {
    const user = await getUserById(id);
    if (!user?.passwordHash) return null;
  }
  return id;
}

/** Signed-in user's id, or a UserError asking them to sign in again. */
export async function requireUserId(): Promise<string> {
  const id = await currentUserId();
  if (!id) throw new UserError("Your session expired. Sign in again to continue.");
  return id;
}
