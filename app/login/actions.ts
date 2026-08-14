"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { normalizeEmail } from "@/lib/users";

/** What the form renders back to the user. `null` means nothing has failed yet. */
export type CredentialsFormState = { error: string | null };

export async function loginWithPassword(
  _prev: CredentialsFormState,
  formData: FormData
): Promise<CredentialsFormState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") || "/dashboard");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (error) {
    // A successful signIn redirects by throwing NEXT_REDIRECT, so only AuthError
    // means the sign-in itself failed — anything else has to keep propagating.
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin"
            ? // Deliberately vague: naming which half was wrong would let anyone
              // probe the database for registered emails.
              "Wrong email or password. If you signed up with Google, use the Google button."
            : "Sign-in failed. Try again.",
      };
    }
    throw error;
  }

  return { error: null };
}
