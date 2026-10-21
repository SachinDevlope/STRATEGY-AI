"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { UserError } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/users";

/** Form state. `error: null` = nothing failed yet. */
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
    // Per IP and per email, so one address can't be brute-forced from many IPs.
    await rateLimit(`login-ip:${await clientIp()}`, 30, 15 * 60);
    await rateLimit(`login-email:${email}`, 10, 15 * 60);
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (error) {
    // Success throws NEXT_REDIRECT, so only AuthError is a real failure.
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin"
            ? // Vague on purpose: don't reveal which emails exist.
              "Wrong email or password. If you signed up with Google, use the Google button."
            : "Sign-in failed. Try again.",
      };
    }
    throw error;
  }

  return { error: null };
}
