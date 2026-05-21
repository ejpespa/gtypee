import { describe, expect, it, vi } from "vitest";
import { Command } from "commander";

import { formatHealthCheck, registerHealthCheckCommands, type HealthCheckResult } from "../../../src/cmd/health-check/commands.js";

const okResult: HealthCheckResult = {
  auth: { ok: true, email: "user@test.com", type: "oauth" },
  services: {
    gmail: { ok: true },
    drive: { ok: true },
  },
  healthy: 2,
  total: 2,
};

const mixedResult: HealthCheckResult = {
  auth: { ok: true, email: "user@test.com", type: "oauth" },
  services: {
    gmail: { ok: true },
    meet: { ok: false, error: "403 — API not enabled" },
  },
  healthy: 1,
  total: 2,
};

const authFailResult: HealthCheckResult = {
  auth: { ok: false, error: "token expired" },
  services: {},
  healthy: 0,
  total: 0,
};

describe("health-check formatter", () => {
  it("formats all-healthy result as JSON", () => {
    const out = formatHealthCheck(okResult, "json");
    const parsed = JSON.parse(out);
    expect(parsed.healthy).toBe(2);
    expect(parsed.total).toBe(2);
    expect(parsed.auth.ok).toBe(true);
  });

  it("formats mixed result as human text", () => {
    const out = formatHealthCheck(mixedResult, "human");
    expect(out).toContain("✓");
    expect(out).toContain("✗");
    expect(out).toContain("1/2");
  });

  it("formats auth failure as human text", () => {
    const out = formatHealthCheck(authFailResult, "human");
    expect(out).toContain("✗");
    expect(out).toContain("token expired");
  });

  it("formats all-healthy result as CSV", () => {
    const out = formatHealthCheck(okResult, "csv");
    expect(out).toContain("service,status");
    expect(out).toContain("gmail,ok");
  });
});

describe("health-check command registration", () => {
  it("registers run subcommand", () => {
    const hc = new Command("health-check");
    registerHealthCheckCommands(hc);
    const names = hc.commands.map((cmd) => cmd.name());
    expect(names).toContain("run");
  });

  it("run calls checkHealth and prints result", async () => {
    const root = new Command();
    const hc = root.command("health-check");
    const checkHealth = vi.fn().mockResolvedValue(okResult);
    registerHealthCheckCommands(hc, { checkHealth });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    await root.parseAsync(["node", "test", "health-check", "run"]);
    process.stdout.write = originalWrite;

    expect(checkHealth).toHaveBeenCalled();
    expect(stdout).toContain("2/2");
  });

  it("run accepts --services filter", async () => {
    const root = new Command();
    const hc = root.command("health-check");
    const checkHealth = vi.fn().mockResolvedValue(okResult);
    registerHealthCheckCommands(hc, { checkHealth });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    await root.parseAsync(["node", "test", "health-check", "run", "--services", "gmail,drive"]);
    process.stdout.write = originalWrite;

    expect(checkHealth).toHaveBeenCalledWith(["gmail", "drive"]);
  });
});
