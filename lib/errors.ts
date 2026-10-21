/** An error whose message is safe to show the user. */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

/** User-safe text for any thrown value. Unknown errors are logged, not shown. */
export function userMessage(error: unknown, fallback: string): string {
  if (error instanceof UserError) return error.message;
  console.error(error);
  return fallback;
}
