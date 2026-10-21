import { describe, expect, it } from "vitest";
import { backfillArrays, failedGeneration, supportsStrict } from "@/lib/ai";

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
