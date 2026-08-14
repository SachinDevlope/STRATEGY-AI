import Groq from "groq-sdk";
import { z } from "zod";

/**
 * All generation goes through Groq directly. There is no gateway in front of
 * it: one provider, one key (GROQ_API_KEY), and the model id is the only thing
 * that changes between call sites.
 */
export const MODELS = {
  /** Long-form reasoning: resumes, interview reports. Honours a JSON schema. */
  strategy: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  /** Short, latency-sensitive calls (titles, tags, classification). */
  fast: "llama-3.3-70b-versatile",
} as const;

export type ModelKey = keyof typeof MODELS;

/**
 * Built on first use rather than at import time, so importing this module
 * during `next build` does not require GROQ_API_KEY to be present in the build
 * environment — the same reason lib/mongodb.ts connects lazily.
 */
let client: Groq | null = null;

export function groq(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('Missing environment variable "GROQ_API_KEY".');
    client = new Groq({ apiKey });
  }
  return client;
}

export type Message = { role: "system" | "user" | "assistant"; content: string };

type CommonOptions = {
  model?: ModelKey;
  system?: string;
  /** Higher means more variation. Left unset, Groq's own default applies. */
  temperature?: number;
  abortSignal?: AbortSignal;
};

/** Either a single prompt or a full message history, never both. */
export type GenerateOptions = CommonOptions &
  ({ prompt: string; messages?: never } | { messages: Message[]; prompt?: never });

function toMessages({ system, prompt, messages }: GenerateOptions): Message[] {
  const body: Message[] = messages ?? [{ role: "user", content: prompt! }];
  return system ? [{ role: "system", content: system }, ...body] : body;
}

/** One-shot completion. Use for anything whose result is stored, not streamed. */
export async function generate(options: GenerateOptions): Promise<string> {
  const completion = await groq().chat.completions.create(
    {
      model: MODELS[options.model ?? "strategy"],
      messages: toMessages(options),
      ...(options.temperature === undefined ? {} : { temperature: options.temperature }),
    },
    { signal: options.abortSignal }
  );
  return completion.choices[0]?.message?.content ?? "";
}

/**
 * Strict mode rejects any object whose `required` array does not list every one
 * of its properties, so a schema with an optional field would 400 the request
 * outright. Schemas that qualify get the stronger guarantee; the rest are sent
 * as before and rely on Zod to catch the difference.
 */
function supportsStrict(node: unknown): boolean {
  if (Array.isArray(node)) return node.every(supportsStrict);
  if (!node || typeof node !== "object") return true;

  const schema = node as Record<string, unknown>;
  if (schema.type === "object" && schema.properties) {
    const properties = Object.keys(schema.properties as Record<string, unknown>);
    const required = new Set((schema.required as string[] | undefined) ?? []);
    if (properties.some((key) => !required.has(key))) return false;
  }

  return Object.values(schema).every(supportsStrict);
}

/**
 * Groq validates a json_schema reply on its side and rejects the whole request
 * with a 400 when the model drops a required field, returning the text it did
 * produce as `failed_generation`. That text is almost always a complete report
 * missing one list, so it is pulled out of the error and repaired below rather
 * than costing the user the entire call. The key is nested at a different depth
 * depending on SDK version, hence the walk.
 */
function failedGeneration(error: unknown, depth = 0): string | null {
  if (!error || typeof error !== "object" || depth > 4) return null;
  const node = error as Record<string, unknown>;
  if (typeof node.failed_generation === "string") return node.failed_generation;
  for (const value of Object.values(node)) {
    const found = failedGeneration(value, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * Fills required top-level arrays the model left out with an empty array, so a
 * reply that is whole apart from one missing list parses instead of throwing.
 * Only arrays: inventing a missing string or number would put made-up content
 * on the page, whereas an empty list is visibly empty and the caller's repair
 * round asks for it again.
 */
function backfillArrays(raw: unknown, jsonSchema: Record<string, unknown>): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;

  const properties = jsonSchema.properties as Record<string, { type?: string }> | undefined;
  const required = (jsonSchema.required as string[] | undefined) ?? [];
  if (!properties) return raw;

  const filled = { ...(raw as Record<string, unknown>) };
  for (const key of required) {
    if (filled[key] === undefined && properties[key]?.type === "array") {
      filled[key] = [];
    }
  }
  return filled;
}

/**
 * Schema-constrained completion.
 *
 * The schema is sent to Groq as a JSON schema, so the model is constrained
 * rather than merely asked, and the reply is still parsed through Zod before it
 * is returned — a constrained decoder can satisfy the shape and still return a
 * value the schema rejects (an out-of-range number, an empty required array).
 * Callers therefore never have to guard against a half-filled object.
 */
export async function generateStructured<T>(
  schema: z.ZodType<T>,
  options: GenerateOptions & { schemaName?: string }
): Promise<T> {
  const { object } = await generateStructuredRaw(schema, options);
  return object;
}

/**
 * Same as generateStructured(), but also returns the raw JSON string the model
 * produced. Callers that run a repair round need the original assistant message
 * to append to the conversation — re-serialising the parsed object would drop
 * whatever the model actually wrote.
 */
export async function generateStructuredRaw<T>(
  schema: z.ZodType<T>,
  options: GenerateOptions & { schemaName?: string }
): Promise<{ object: T; content: string }> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;

  const request = {
    model: MODELS[options.model ?? "strategy"],
    messages: toMessages(options),
    ...(options.temperature === undefined ? {} : { temperature: options.temperature }),
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: options.schemaName ?? "result",
        // Without strict, the schema is a hint the model is free to drift
        // from — it returned objects where an array of strings was declared.
        // Strict holds the decoder to the declared types. It cannot be used
        // on every schema, hence the check; and it still ignores keyword
        // constraints (minItems, minimum), which belong in the prompt and a
        // post-check rather than here.
        ...(supportsStrict(jsonSchema) ? { strict: true } : {}),
        schema: jsonSchema,
      },
    },
  };

  let content: string;
  try {
    const completion = await groq().chat.completions.create(request, {
      signal: options.abortSignal,
    });
    content = completion.choices[0]?.message?.content ?? "";
  } catch (error) {
    const salvaged = failedGeneration(error);
    if (!salvaged) throw error;
    console.warn("Groq rejected its own generation; repairing it locally.");
    content = salvaged;
  }
  if (!content) throw new Error("The model returned an empty response.");

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("The model returned invalid JSON.");
  }

  const parsed = schema.safeParse(backfillArrays(raw, jsonSchema));
  if (!parsed.success) {
    console.error(
      "Schema validation failed:",
      JSON.stringify(z.treeifyError(parsed.error), null, 2)
    );
    // Naming the offending fields is what makes this debuggable: the generic
    // message alone said nothing about which part of the reply was wrong.
    const where = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`The model returned an invalid schema — ${where}`);
  }

  return { object: parsed.data, content };
}
