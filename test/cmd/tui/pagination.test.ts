import { describe, it, expect } from "vitest";
import {
  DEFAULT_TUI_PAGE_SIZE,
  ORG_UNITS_TUI_PAGE_SIZE,
  mergeNextPageToken,
  hasNextTokenPage,
  sliceLocalPage,
  shouldHandlePaginationKey,
} from "../../../src/cmd/tui/pagination.js";

describe("mergeNextPageToken", () => {
  it("stores next token at index+1 when API returns one", () => {
    const result = mergeNextPageToken([undefined], 0, "token-page-2");
    expect(result[1]).toBe("token-page-2");
  });

  it("clears stale forward token when API returns no next page", () => {
    const result = mergeNextPageToken([undefined, "old-forward"], 0, undefined);
    expect(result[1]).toBeUndefined();
  });
});

describe("hasNextTokenPage", () => {
  it("is true when a forward token exists", () => {
    expect(hasNextTokenPage([undefined, "t2"], 0)).toBe(true);
  });

  it("is false at terminal page", () => {
    expect(hasNextTokenPage([undefined], 0)).toBe(false);
  });
});

describe("sliceLocalPage", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  it("returns first page and signals more pages", () => {
    const { slice, hasNextPage } = sliceLocalPage(items, 0);
    expect(slice).toHaveLength(DEFAULT_TUI_PAGE_SIZE);
    expect(slice[0]).toBe(0);
    expect(hasNextPage).toBe(true);
  });

  it("returns final partial page without next", () => {
    const { slice, hasNextPage } = sliceLocalPage(items, 1);
    expect(slice).toEqual([20, 21, 22, 23, 24]);
    expect(hasNextPage).toBe(false);
  });

  it("supports smaller page sizes for multi-line TUI lists", () => {
    const { slice, hasNextPage } = sliceLocalPage(items, 0, ORG_UNITS_TUI_PAGE_SIZE);
    expect(slice).toHaveLength(ORG_UNITS_TUI_PAGE_SIZE);
    expect(hasNextPage).toBe(true);
  });
});

describe("shouldHandlePaginationKey", () => {
  it("returns next on right arrow when not blocked", () => {
    expect(shouldHandlePaginationKey("", { rightArrow: true }, false)).toBe("next");
  });

  it("returns null when blocked (modal active)", () => {
    expect(shouldHandlePaginationKey(" ", { rightArrow: true }, true)).toBeNull();
  });
});