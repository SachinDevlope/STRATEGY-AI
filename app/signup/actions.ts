"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import type { CredentialsFormState } from "@/app/login/actions";
import { UserError } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  createUserWithPassword,
  EmailTakenError,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
} from "@/lib/users";

/** Basic shape check only. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUpWithPassword(
  _prev: CredentialsFormState,
  formData: FormData
): Promise<CredentialsFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Enter your name." };
  if (!EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  try {
    // Also slows down probing which emails are registered.
    await rateLimit(`signup-ip:${await clientIp()}`, 5, 60 * 60);
    await createUserWithPassword({ name, email, password });
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    if (error instanceof EmailTakenError) {
      return { error: "That email already has an account. Log in instead." };
    }
    throw error;
  }

  try {
    // Sign straight in so the user lands on the dashboard.
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    // Success throws NEXT_REDIRECT. The account exists either way.
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Try logging in." };
    }
    throw error;
  }

  return { error: null };
}
