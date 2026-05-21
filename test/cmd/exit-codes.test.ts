import { describe, expect, it } from "vitest";

import {
  EXIT_CODE_OK,
  EXIT_CODE_GENERIC_ERROR,
  EXIT_CODE_USAGE,
  EXIT_CODE_AUTH,
  EXIT_CODE_RATE_LIMIT,
  EXIT_CODE_TIMEOUT,
  EXIT_CODE_NOT_FOUND,
  EXIT_CODE_EMPTY,
} from "../../src/cmd/exit-codes.js";
import { ExitError, exitCode } from "../../src/cmd/exit.js";
import { AuthRequiredError, RateLimitError, NotFoundError, PermissionDeniedError } from "../../src/googleapi/errors.js";
import { formatExitCodes } from "../../src/cmd/exit-codes/commands.js";

describe("exit code constants", () => {
  it("has all 8 exit codes with distinct values", () => {
    const codes = [EXIT_CODE_OK, EXIT_CODE_GENERIC_ERROR, EXIT_CODE_USAGE, EXIT_CODE_AUTH, EXIT_CODE_RATE_LIMIT, EXIT_CODE_TIMEOUT, EXIT_CODE_NOT_FOUND, EXIT_CODE_EMPTY];
    expect(new Set(codes).size).toBe(8);
  });
});

describe("exitCode mapping", () => {
  it("maps ExitError to its code", () => {
    expect(exitCode(new ExitError(7, "empty"))).toBe(7);
  });

  it("maps AuthRequiredError to EXIT_CODE_AUTH", () => {
    expect(exitCode(new AuthRequiredError("gmail", "a@b.com", ""))).toBe(EXIT_CODE_AUTH);
  });

  it("maps PermissionDeniedError to EXIT_CODE_AUTH", () => {
    expect(exitCode(new PermissionDeniedError("file", "read"))).toBe(EXIT_CODE_AUTH);
  });

  it("maps RateLimitError to EXIT_CODE_RATE_LIMIT", () => {
    expect(exitCode(new RateLimitError(3))).toBe(EXIT_CODE_RATE_LIMIT);
  });

  it("maps NotFoundError to EXIT_CODE_NOT_FOUND", () => {
    expect(exitCode(new NotFoundError("file", "abc"))).toBe(EXIT_CODE_NOT_FOUND);
  });

  it("maps DOMException TimeoutError to EXIT_CODE_TIMEOUT", () => {
    const err = new DOMException("signal timed out", "TimeoutError");
    expect(exitCode(err)).toBe(EXIT_CODE_TIMEOUT);
  });

  it("maps wrapped auth error (via cause) to EXIT_CODE_AUTH", () => {
    const cause = new AuthRequiredError("gmail", "a@b.com", "");
    const wrapper = new Error("gmail api request failed", { cause });
    expect(exitCode(wrapper)).toBe(EXIT_CODE_AUTH);
  });

  it("maps unknown errors to EXIT_CODE_GENERIC_ERROR", () => {
    expect(exitCode(new Error("something"))).toBe(EXIT_CODE_GENERIC_ERROR);
  });
});

describe("formatExitCodes", () => {
  it("includes all exit codes in JSON output", () => {
    const out = formatExitCodes("json");
    const parsed = JSON.parse(out);
    expect(parsed.ok).toBe(0);
    expect(parsed.auth).toBe(3);
    expect(parsed.rate_limit).toBe(4);
    expect(parsed.timeout).toBe(5);
    expect(parsed.not_found).toBe(6);
    expect(parsed.empty).toBe(7);
  });

  it("includes all exit codes in human output", () => {
    const out = formatExitCodes("human");
    expect(out).toContain("auth");
    expect(out).toContain("rate_limit");
    expect(out).toContain("timeout");
    expect(out).toContain("not_found");
    expect(out).toContain("empty");
  });
});
