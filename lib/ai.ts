import { generateText, streamText, type ModelMessage } from "ai";

/**
 * Models are referenced as plain "provider/model" strings. The AI SDK routes
 * these through the Vercel AI Gateway (its default global provider), so no
 * provider SDK is installed and swapping providers is a one-line change.
 *
 * Auth comes from AI_GATEWAY_API_KEY locally and from OIDC on Vercel.
 */
export const MODELS = {
  /** Long-form strategy generation. */
  strategy: "anthropic/claude-sonnet-5",
  /** Short, latency-sensitive calls (titles, tags, classification). */
  fast: "anthropic/claude-haiku-4.5",
} as const;

export type ModelKey = keyof typeof MODELS;

type CommonOptions = {
  model?: ModelKey;
  system?: string;
  abortSignal?: AbortSignal;
};

/** Either a single prompt or a full message history, never both. */
export type GenerateOptions = CommonOptions &
  ({ prompt: string; messages?: never } | { messages: ModelMessage[]; prompt?: never });

function resolve({ model = "strategy", ...rest }: GenerateOptions) {
  return { model: MODELS[model], ...rest };
}

/** One-shot completion. Use for anything whose result is stored, not streamed. */
export async function generate(options: GenerateOptions) {
  const { text } = await generateText(resolve(options));
  return text;
}

/**
 * Streaming completion. Return `result.toUIMessageStreamResponse()` from a
 * route handler to stream to the browser.
 */
export function stream(options: GenerateOptions) {
  return streamText(resolve(options));
}
