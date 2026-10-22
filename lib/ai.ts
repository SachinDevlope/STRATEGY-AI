import Groq from "groq-sdk";
import { z } from "zod";

/** All generation goes through Groq (GROQ_API_KEY). Override the model with GROQ_MODEL. */
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

/** Created on first use, so `next build` doesn't need GROQ_API_KEY. */
let client: Groq | null = null;

function groq(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('Missing environment variable "GROQ_API_KEY".');
    client = new Groq({ apiKey });
  }
  return client;
}

/** Speech to text with Groq Whisper. The file name's extension tells Groq the format. */
export async function transcribeAudio(file: File): Promise<string> {
  const result = await groq().audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo",
    language: "en",
  });
  return result.text.trim();
}

export type Message = { role: "system" | "user" | "assistant"; content: string };

/** A single prompt or a full message history, never both. */
type GenerateOptions = { system?: string; schemaName?: string } & (
  | { prompt: string; messages?: never }
  | { messages: Message[]; prompt?: never }
);

function toMessages({ system, prompt, messages }: GenerateOptions): Message[] {
  const body: Message[] = messages ?? [{ role: "user", content: prompt! }];
  return system ? [{ role: "system", content: system }, ...body] : body;
}

/**
 * Strict mode needs every property listed in `required`. Returns false if any
 * object has an optional field (strict would 400); Zod still checks those.
 */
export function supportsStrict(node: unknown): boolean {
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
 * When Groq rejects its own output (400), the text is in `failed_generation`.
 * It's usually nearly complete, so we salvage it. Depth varies by SDK version.
 */
export function failedGeneration(error: unknown, depth = 0): string | null {
  if (!error || typeof error !== "object" || depth > 4) return null;
  const node = error as Record<string, unknown>;
  if (typeof node.failed_generation === "string") return node.failed_generation;
  for (const value of Object.values(node)) {
    const found = failedGeneration(value, depth + 1);
    if (found) return found;
  }
  return null;
}

/** Fills missing top-level arrays with []. Other types are never made up. */
export function backfillArrays(raw: unknown, jsonSchema: Record<string, unknown>): unknown {
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

/** JSON-schema-constrained completion, validated with Zod. Valid object or error. */
export async function generateStructured<T>(
  schema: z.ZodType<T>,
  options: GenerateOptions
): Promise<T> {
  const { object } = await generateStructuredRaw(schema, options);
  return object;
}

/** Like generateStructured(), plus the raw reply text (needed for repair rounds). */
export async function generateStructuredRaw<T>(
  schema: z.ZodType<T>,
  options: GenerateOptions
): Promise<{ object: T; content: string }> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;

  const request = {
    model: MODEL,
    messages: toMessages(options),
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: options.schemaName ?? "result",
        // Strict enforces types. It ignores minItems/minimum — those are checked after.
        ...(supportsStrict(jsonSchema) ? { strict: true } : {}),
        schema: jsonSchema,
      },
    },
  };

  // Bad output (unparseable or off-schema) gets one fresh retry; API errors don't.
  let lastProblem = "";
  for (let attempt = 1; attempt <= MAX_OUTPUT_ATTEMPTS; attempt++) {
    let content: string;
    try {
      const completion = await groq().chat.completions.create(request);
      content = completion.choices[0]?.message?.content ?? "";
    } catch (error) {
      const salvaged = failedGeneration(error);
      if (!salvaged) throw error;
      console.warn("Groq rejected its own generation; repairing it locally.");
      content = salvaged;
    }

    const raw = parseModelJson(content);
    if (raw === undefined) {
      lastProblem = content ? "The model returned invalid JSON." : "The model returned an empty response.";
      console.warn(`${lastProblem} Attempt ${attempt} of ${MAX_OUTPUT_ATTEMPTS}.`);
      continue;
    }

    const parsed = schema.safeParse(backfillArrays(raw, jsonSchema));
    if (parsed.success) return { object: parsed.data, content };

    console.error("Schema validation failed:", JSON.stringify(z.treeifyError(parsed.error), null, 2));
    const where = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    lastProblem = `The model returned an invalid schema — ${where}`;
  }

  throw new Error(lastProblem);
}

const MAX_OUTPUT_ATTEMPTS = 2;

/**
 * JSON.parse that also accepts the wrappers models add: ```json fences or
 * text around the object. Returns undefined when nothing parses.
 */
export function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const candidates = [
    trimmed,
    trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""),
    trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {}
  }
  return undefined;
}
