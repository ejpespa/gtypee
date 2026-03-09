const DEFAULT_THRESHOLD = 5;
const DEFAULT_RESET_MS = 30_000;

export type CircuitBreakerOptions = {
  threshold?: number;
  resetMs?: number;
  now?: () => number;
};

export class CircuitBreaker {
  private failures = 0;
  private open = false;
  private lastFailure = 0;

  private readonly threshold: number;
  private readonly resetMs: number;
  private readonly now: () => number;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.threshold = opts.threshold ?? DEFAULT_THRESHOLD;
    this.resetMs = opts.resetMs ?? DEFAULT_RESET_MS;
    this.now = opts.now ?? (() => Date.now());
  }

  recordSuccess(): void {
    this.failures = 0;
    this.open = false;
  }

  recordFailure(): boolean {
    this.failures += 1;
    this.lastFailure = this.now();
    if (this.failures >= this.threshold) {
      this.open = true;
      return true;
    }
    return false;
  }

  isOpen(): boolean {
    if (!this.open) {
      return false;
    }
    if (this.now() - this.lastFailure > this.resetMs) {
      this.open = false;
      this.failures = 0;
      return false;
    }
    return true;
  }

  state(): "open" | "closed" {
    return this.isOpen() ? "open" : "closed";
  }
}
