import { EXIT_CODE_GENERIC_ERROR, EXIT_CODE_USAGE } from "./exit-codes.js";

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

  return EXIT_CODE_GENERIC_ERROR;
}
