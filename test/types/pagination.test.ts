import { describe, it, expect } from "vitest";
import type { PaginatedResult, PaginationOptions } from "../../src/types/pagination.js";

describe("Pagination Types", () => {
  it("PaginatedResult should accept items without nextPageToken", () => {
    const result: PaginatedResult<{ id: string }> = {
      items: [{ id: "1" }, { id: "2" }],
    };
    expect(result.items).toHaveLength(2);
    expect(result.nextPageToken).toBeUndefined();
  });

  it("PaginatedResult should include nextPageToken when present", () => {
    const result: PaginatedResult<{ id: string }> = {
      items: [{ id: "1" }],
      nextPageToken: "abc123",
    };
    expect(result.nextPageToken).toBe("abc123");
  });

  it("PaginationOptions should accept optional pageSize and pageToken", () => {
    const options: PaginationOptions = {
      pageSize: 50,
      pageToken: "xyz789",
    };
    expect(options.pageSize).toBe(50);
    expect(options.pageToken).toBe("xyz789");
  });

  it("PaginationOptions should allow empty object", () => {
    const options: PaginationOptions = {};
    expect(options.pageSize).toBeUndefined();
    expect(options.pageToken).toBeUndefined();
  });
});
