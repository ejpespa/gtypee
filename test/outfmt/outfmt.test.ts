import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { applyJsonTransform, fromFlags, writeCsv } from "../../src/outfmt/outfmt.js";

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

  it("returns csv mode", () => {
    expect(fromFlags(false, false, true)).toBe("csv");
  });

  it("throws when json and plain are both enabled", () => {
    expect(() => fromFlags(true, true)).toThrow("cannot combine --json, --plain, and --csv");
  });

  it("throws when json and csv are both enabled", () => {
    expect(() => fromFlags(true, false, true)).toThrow("cannot combine --json, --plain, and --csv");
  });

  it("throws when plain and csv are both enabled", () => {
    expect(() => fromFlags(false, true, true)).toThrow("cannot combine --json, --plain, and --csv");
  });

  it("throws when all three are enabled", () => {
    expect(() => fromFlags(true, true, true)).toThrow("cannot combine --json, --plain, and --csv");
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

describe("writeCsv", () => {
  let written: string;

  beforeEach(() => {
    written = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      written += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("outputs header and rows for array of objects", () => {
    writeCsv([
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ]);
    expect(written).toBe("id,name\n1,Alice\n2,Bob\n");
  });

  it("outputs header and single row for a single object", () => {
    writeCsv({ id: "1", name: "Alice" });
    expect(written).toBe("id,name\n1,Alice\n");
  });

  it("escapes fields containing commas", () => {
    writeCsv([{ value: "a,b" }]);
    expect(written).toBe('value\n"a,b"\n');
  });

  it("escapes fields containing double quotes", () => {
    writeCsv([{ value: 'say "hello"' }]);
    expect(written).toBe('value\n"say ""hello"""\n');
  });

  it("escapes fields containing newlines", () => {
    writeCsv([{ value: "line1\nline2" }]);
    expect(written).toBe('value\n"line1\nline2"\n');
  });

  it("handles null and undefined values as empty strings", () => {
    writeCsv([{ a: null, b: undefined, c: "ok" }]);
    expect(written).toBe("a,b,c\n,,ok\n");
  });

  it("does nothing for null input", () => {
    writeCsv(null);
    expect(written).toBe("");
  });

  it("does nothing for empty array", () => {
    writeCsv([]);
    expect(written).toBe("");
  });
});
