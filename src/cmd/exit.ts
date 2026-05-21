import {
  EXIT_CODE_AUTH,
  EXIT_CODE_GENERIC_ERROR,
  EXIT_CODE_NOT_FOUND,
  EXIT_CODE_RATE_LIMIT,
  EXIT_CODE_TIMEOUT,
  EXIT_CODE_USAGE,
} from "./exit-codes.js";
import {
  isAuthRequiredError,
  isNotFoundError,
  isPermissionDeniedError,
  isRateLimitError,
} from "../googleapi/errors.js";

export class ExitError extends Error {
  readonly code: number;

  constructor(code: number, message: string, cause?: unknown) {
    super(message, cause ? { cause } : undefined);
    this.name = "ExitError";
    this.code = code;
  }
}

export function usageError(message: string): ExitError {
  return new ExitError(EXIT_CODE_USAGE, message);
}

export function exitCode(error: unknown): number {
  if (error instanceof ExitError) {
    return error.code;
  }

  if (isAuthRequiredError(error) || isPermissionDeniedError(error)) {
    return EXIT_CODE_AUTH;
  }

  if (isRateLimitError(error)) {
    return EXIT_CODE_RATE_LIMIT;
  }

  if (isNotFoundError(error)) {
    return EXIT_CODE_NOT_FOUND;
  }

  // AbortSignal.timeout() throws a DOMException with name "TimeoutError"
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return EXIT_CODE_TIMEOUT;
  }

  // Check wrapped errors — commands wrap API errors in new Error(..., { cause })
  if (error instanceof Error && error.cause !== undefined) {
    const causeCode = exitCode(error.cause);
    if (causeCode !== EXIT_CODE_GENERIC_ERROR) {
      return causeCode;
    }
  }

  return EXIT_CODE_GENERIC_ERROR;
}
