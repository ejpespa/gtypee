import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";
import { ExitError } from "../exit.js";
import { EXIT_CODE_AUTH, EXIT_CODE_GENERIC_ERROR } from "../exit-codes.js";

export type ServiceStatus = {
  ok: boolean;
  error?: string;
};

export type AuthStatus = {
  ok: boolean;
  email?: string;
  type?: string;
  error?: string;
};

export type HealthCheckResult = {
  auth: AuthStatus;
  services: Record<string, ServiceStatus>;
  healthy: number;
  total: number;
};

export type HealthCheckDeps = {
  checkHealth?: (services?: string[]) => Promise<HealthCheckResult>;
};

const defaultDeps: Required<HealthCheckDeps> = {
  checkHealth: async () => ({ auth: { ok: false, error: "not configured" }, services: {}, healthy: 0, total: 0 }),
};

export function formatHealthCheck(result: HealthCheckResult, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(result, null, 2);
  }

  if (mode === "csv") {
    const lines = ["service,status,error"];
    lines.push(`auth,${result.auth.ok ? "ok" : "fail"},${result.auth.error ?? ""}`);
    for (const [name, status] of Object.entries(result.services)) {
      lines.push(`${name},${status.ok ? "ok" : "fail"},${status.error ?? ""}`);
    }
    return lines.join("\n");
  }

  const lines: string[] = [];
  const authIcon = result.auth.ok ? "✓" : "✗";
  const authDetail = result.auth.ok
    ? `OAuth token valid (${result.auth.email ?? "unknown"})`
    : result.auth.error ?? "auth failed";
  lines.push(`Auth:       ${authIcon} ${authDetail}`);

  for (const [name, status] of Object.entries(result.services)) {
    const icon = status.ok ? "✓" : "✗";
    const detail = status.ok ? "reachable" : `unreachable (${status.error ?? "unknown error"})`;
    const padded = `${name}:`.padEnd(12);
    lines.push(`${padded}${icon} ${detail}`);
  }

  lines.push("");
  lines.push(`${result.healthy}/${result.total} services healthy`);
  return lines.join("\n");
}

export function registerHealthCheckCommands(
  healthCheckCommand: Command,
  deps: HealthCheckDeps = {},
): void {
  const resolvedDeps: Required<HealthCheckDeps> = { ...defaultDeps, ...deps };

  healthCheckCommand
    .command("run")
    .description("Check auth and API connectivity")
    .option("--services <list>", "Comma-separated list of services to check")
    .action(async function actionRun(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ services?: string }>();
      const serviceFilter = opts.services
        ? opts.services.split(",").map((s) => s.trim()).filter((s) => s !== "")
        : undefined;

      const result = await resolvedDeps.checkHealth(serviceFilter);
      process.stdout.write(`${formatHealthCheck(result, ctx.output.mode)}\n`);

      if (!result.auth.ok) {
        throw new ExitError(EXIT_CODE_AUTH, "auth check failed");
      }
      if (result.healthy < result.total) {
        throw new ExitError(EXIT_CODE_GENERIC_ERROR, `${result.total - result.healthy} service(s) unreachable`);
      }
    });
}
