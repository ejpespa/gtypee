import { describe, expect, it } from "vitest";

import { applyJsonTransform, fromFlags } from "../../src/outfmt/outfmt.js";

describe("fromFlags", () => {
  it("returns json mode", () => {
    expect(fromFlags(true, false)).toBe("json");
  });

  it("returns plain mode", () => {
    expect(fromFlags(false, true)).toBe("plain");
  });

  it("returns human mode by default", () => {
    expect(fromFlags(false, false)).toBe("human");
  });

  it("throws when json and plain are both enabled", () => {
    expect(() => fromFlags(true, true)).toThrow("cannot combine --json and --plain");
  });
});

describe("applyJsonTransform", () => {
  it("returns primary result when resultsOnly is true", () => {
    const value = {
      result: { id: "1", title: "hello" },
      nextPageToken: "abc",
    };

    expect(applyJsonTransform(value, { resultsOnly: true, select: [] })).toEqual({
      id: "1",
      title: "hello",
    });
  });

  it("projects selected fields", () => {
    const value = {
      id: "1",
      title: "hello",
      nested: { name: "n" },
      other: 5,
    };

    expect(applyJsonTransform(value, { resultsOnly: false, select: ["id", "nested.name"] })).toEqual({
      id: "1",
      nested: { name: "n" },
    });
  });
});
