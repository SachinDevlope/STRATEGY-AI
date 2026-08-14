"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { CredentialsFormState } from "@/app/login/actions";

const INPUT_CLASS =
  "w-full bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/40 transition-colors";

const LABEL_CLASS = "text-label-md text-on-surface-variant";

/** Separate component so useFormStatus reads the enclosing form's pending state. */
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-primary hover:bg-primary-fixed disabled:opacity-50 text-on-primary font-semibold py-3.5 px-6 rounded-lg transition-colors"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

/**
 * Email + password form for /login and /signup. The signup variant adds a name
 * field; the login variant carries the callbackUrl through so a user bounced off
 * a protected page returns to it.
 */
export default function CredentialsForm({
  mode,
  action,
  callbackUrl,
  minPasswordLength,
}: {
  mode: "login" | "signup";
  action: (
    state: CredentialsFormState,
    formData: FormData
  ) => Promise<CredentialsFormState>;
  callbackUrl?: string;
  minPasswordLength: number;
}) {
  const [state, formAction] = useActionState(action, { error: null });
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p
          role="alert"
          className="text-body-sm text-error bg-error/10 border border-error/30 rounded-lg px-4 py-3"
        >
          {state.error}
        </p>
      ) : null}

      {isSignup ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className={LABEL_CLASS}>
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Aditya Sharma"
            className={INPUT_CLASS}
          />
        </div>
      ) : (
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={LABEL_CLASS}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={LABEL_CLASS}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          // Browsers offer to generate a password on signup only with this value.
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? minPasswordLength : undefined}
          placeholder={isSignup ? `At least ${minPasswordLength} characters` : "••••••••"}
          className={INPUT_CLASS}
        />
      </div>

      <SubmitButton label={isSignup ? "Create account" : "Log in"} />
    </form>
  );
}
