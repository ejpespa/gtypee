export class AuthRequiredError extends Error {
  constructor(
    readonly service: string,
    readonly email: string,
    readonly client: string,
    readonly cause?: unknown,
  ) {
    super(
      client !== ""
        ? `auth required for ${service} ${email} (client ${client})`
        : `auth required for ${service} ${email}`,
      cause ? { cause } : undefined,
    );
    this.name = "AuthRequiredError";
  }
}

export class RateLimitError extends Error {
  constructor(
    readonly retries: number,
    readonly retryAfterMs = 0,
  ) {
    super(
      retryAfterMs > 0
        ? `rate limit exceeded, retry after ${retryAfterMs}ms (attempted ${retries} retries)`
        : `rate limit exceeded after ${retries} retries`,
    );
    this.name = "RateLimitError";
  }
}

export class CircuitBreakerError extends Error {
  constructor() {
    super("circuit breaker is open, too many recent failures - try again later");
    this.name = "CircuitBreakerError";
  }
}

export class QuotaExceededError extends Error {
  constructor(readonly resource = "") {
    super(resource !== "" ? `API quota exceeded for ${resource}` : "API quota exceeded");
    this.name = "QuotaExceededError";
  }
}

export class NotFoundError extends Error {
  constructor(
    readonly resource: string,
    readonly id = "",
  ) {
    super(id !== "" ? `${resource} not found: ${id}` : `${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class PermissionDeniedError extends Error {
  constructor(
    readonly resource: string,
    readonly action = "",
  ) {
    super(action !== "" ? `permission denied: cannot ${action} ${resource}` : `permission denied for ${resource}`);
    this.name = "PermissionDeniedError";
  }
}

export function isAuthRequiredError(error: unknown): error is AuthRequiredError {
  return error instanceof AuthRequiredError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isCircuitBreakerError(error: unknown): error is CircuitBreakerError {
  return error instanceof CircuitBreakerError;
}

export function isQuotaExceededError(error: unknown): error is QuotaExceededError {
  return error instanceof QuotaExceededError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isPermissionDeniedError(error: unknown): error is PermissionDeniedError {
  return error instanceof PermissionDeniedError;
}

export function toCliApiErrorMessage(service: string, error: unknown): string {
  if (
    isAuthRequiredError(error)
    || isRateLimitError(error)
    || isCircuitBreakerError(error)
    || isQuotaExceededError(error)
    || isNotFoundError(error)
    || isPermissionDeniedError(error)
  ) {
    return error.message;
  }

  const message = error instanceof Error ? error.message : String(error);
  return `${service} api request failed: ${message}`;
}
