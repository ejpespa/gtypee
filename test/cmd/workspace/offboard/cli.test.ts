import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerOffboardCommand } from '../../../../src/cmd/workspace/commands.js';
import type { OffboardSummary } from '../../../../src/cmd/workspace/offboard/types.js';

describe('registerOffboardCommand', () => {
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    originalIsTTY = process.stdin.isTTY;
  });

  afterEach(() => {
    process.stdin.isTTY = originalIsTTY ?? false;
    vi.restoreAllMocks();
  });

  it('registers offboard subcommand with flags and description', () => {
    const parent = new Command();
    registerOffboardCommand(parent, { offboardUser: vi.fn() });
    const cmd = parent.commands.find((c) => c.name() === 'offboard');

    expect(cmd).toBeDefined();
    expect(cmd?.description()).toContain('Offboard a user');
    expect(cmd?.options.some((o) => o.long === '--dry-run')).toBe(true);
    expect(cmd?.options.some((o) => o.long === '--wipe-devices')).toBe(true);
    expect(cmd?.options.some((o) => o.long === '--transfer-drive-to')).toBe(true);
    expect(cmd?.options.some((o) => o.long === '--remove-groups')).toBe(true);
    expect(cmd?.options.some((o) => o.long === '--force-admin-offboard')).toBe(true);
    expect(cmd?.options.some((o) => o.long === '--yes')).toBe(true);
    expect(cmd?.options.some((o) => o.long === '--force')).toBe(true);
    expect(cmd?.options.some((o) => o.long === '--json')).toBe(true);
  });

  it('triggers SEC-06 headless guard and exits 1 if not interactive and no --yes/--force/--dry-run', async () => {
    process.stdin.isTTY = false;
    const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as any);
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockOffboardUser = vi.fn();
    const parent = new Command();
    registerOffboardCommand(parent, { offboardUser: mockOffboardUser });

    await expect(parent.parseAsync(['node', 'test', 'offboard', 'target@example.com'])).rejects.toThrow(
      'process.exit called'
    );

    expect(consoleErrorMock).toHaveBeenCalledWith(
      expect.stringContaining('Confirmation required. Pass --yes or --dry-run in non-interactive environments.')
    );
    expect(exitMock).toHaveBeenCalledWith(1);
    expect(mockOffboardUser).not.toHaveBeenCalled();
  });

  it('allows execution in headless environment when --dry-run is passed', async () => {
    process.stdin.isTTY = false;
    const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    const consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {});

    const summary: OffboardSummary = {
      email: 'target@example.com',
      dryRun: true,
      success: true,
      completedAt: new Date().toISOString(),
      steps: [{ name: 'Step 1', status: 'skipped', detail: '[Dry Run] Sample' }],
    };
    const mockOffboardUser = vi.fn().mockResolvedValue(summary);

    const parent = new Command();
    registerOffboardCommand(parent, { offboardUser: mockOffboardUser });

    await parent.parseAsync(['node', 'test', 'offboard', 'target@example.com', '--dry-run']);

    expect(exitMock).not.toHaveBeenCalled();
    expect(mockOffboardUser).toHaveBeenCalledWith({
      email: 'target@example.com',
      dryRun: true,
      wipeDevices: undefined,
      transferDriveTo: undefined,
      removeFromGroups: undefined,
      forceAdminOffboard: undefined,
    });
    expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Offboarding summary for target@example.com: SUCCESS'));
  });

  it('allows execution in headless environment when --yes is passed and maps all flags', async () => {
    process.stdin.isTTY = false;
    const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    const consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {});

    const summary: OffboardSummary = {
      email: 'target@example.com',
      dryRun: false,
      success: true,
      completedAt: new Date().toISOString(),
      steps: [
        { name: 'Containment', status: 'success', detail: 'Suspended' },
        { name: 'Drive transfer', status: 'failed', error: 'Disk quota' },
      ],
    };
    const mockOffboardUser = vi.fn().mockResolvedValue(summary);

    const parent = new Command();
    registerOffboardCommand(parent, { offboardUser: mockOffboardUser });

    await parent.parseAsync([
      'node',
      'test',
      'offboard',
      'target@example.com',
      '--yes',
      '--wipe-devices',
      '--transfer-drive-to',
      'dest@example.com',
      '--remove-groups',
      '--force-admin-offboard',
    ]);

    expect(exitMock).not.toHaveBeenCalled();
    expect(mockOffboardUser).toHaveBeenCalledWith({
      email: 'target@example.com',
      dryRun: undefined,
      wipeDevices: true,
      transferDriveTo: 'dest@example.com',
      removeFromGroups: true,
      forceAdminOffboard: true,
    });
    expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Offboarding summary for target@example.com: SUCCESS'));
  });

  it('outputs JSON format when --json is passed', async () => {
    process.stdin.isTTY = false;
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    const consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {});

    const summary: OffboardSummary = {
      email: 'target@example.com',
      dryRun: false,
      success: true,
      completedAt: '2026-09-18T12:00:00.000Z',
      steps: [{ name: 'Containment', status: 'success' }],
    };
    const mockOffboardUser = vi.fn().mockResolvedValue(summary);

    const parent = new Command();
    registerOffboardCommand(parent, { offboardUser: mockOffboardUser });

    await parent.parseAsync(['node', 'test', 'offboard', 'target@example.com', '--force', '--json']);

    expect(consoleLogMock).toHaveBeenCalledWith(JSON.stringify(summary, null, 2));
  });
});
