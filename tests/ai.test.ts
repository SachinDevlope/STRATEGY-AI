import { describe, expect, it } from "vitest";
import { backfillArrays, failedGeneration, parseModelJson, supportsStrict } from "@/lib/ai";

describe("supportsStrict", () => {
  it("accepts objects where every property is required", () => {
    expect(
      supportsStrict({
        type: "object",
        properties: { a: { type: "string" }, b: { type: "array", items: { type: "string" } } },
        required: ["a", "b"],
      })
    ).toBe(true);
  });

  it("rejects a nested object with an optional field", () => {
    expect(
      supportsStrict({
        type: "object",
        properties: {
          inner: { type: "object", properties: { x: {}, y: {} }, required: ["x"] },
        },
        required: ["inner"],
      })
    ).toBe(false);
  });
});

describe("failedGeneration", () => {
  it("finds the salvaged text at any depth", () => {
    const error = { error: { error: { failed_generation: '{"a":1}' } } };
    expect(failedGeneration(error)).toBe('{"a":1}');
  });

  it("returns null when there is nothing to salvage", () => {
    expect(failedGeneration(new Error("boom"))).toBeNull();
    expect(failedGeneration(null)).toBeNull();
  });
});

describe("backfillArrays", () => {
  const schema = {
    properties: { list: { type: "array" }, name: { type: "string" } },
    required: ["list", "name"],
  };

  it("fills a missing required array with []", () => {
    expect(backfillArrays({ name: "x" }, schema)).toEqual({ name: "x", list: [] });
  });

  it("never invents a missing string", () => {
    expect(backfillArrays({ list: [1] }, schema)).toEqual({ list: [1] });
  });

  it("leaves non-objects alone", () => {
    expect(backfillArrays([1, 2], schema)).toEqual([1, 2]);
  });
});

describe("parseModelJson", () => {
  it("parses plain JSON", () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips code fences and surrounding text", () => {
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseModelJson('Here you go: {"a":[1,2]} hope it helps')).toEqual({ a: [1, 2] });
  });

  it("returns undefined for empty or broken output", () => {
    expect(parseModelJson("")).toBeUndefined();
    expect(parseModelJson('{"a": [1, 2')).toBeUndefined();
  });
});
