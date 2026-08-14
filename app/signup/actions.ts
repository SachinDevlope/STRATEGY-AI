"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import type { CredentialsFormState } from "@/app/login/actions";
import {
  createUserWithPassword,
  EmailTakenError,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
} from "@/lib/users";

/** Cheap sanity check, not RFC-5322 validation — the real test is a deliverable inbox. */
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
    await createUserWithPassword({ name, email, password });
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return {
        error: "That email already has an account. Log in instead.",
      };
    }
    throw error;
  }

  try {
    // Signing in right after creation means the new user lands on the dashboard
    // instead of being bounced to the login form to retype what they just typed.
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    // NEXT_REDIRECT on success; only AuthError is a real failure. The account
    // exists either way, so send them to log in rather than reporting a dead end.
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Try logging in." };
    }
    throw error;
  }

  return { error: null };
}
