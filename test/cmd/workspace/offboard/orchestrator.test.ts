import { describe, it, expect, vi } from 'vitest';
import { executeOffboardPipeline } from '../../../../src/cmd/workspace/offboard/orchestrator.js';
import type { OffboardPipelineDeps } from '../../../../src/cmd/workspace/offboard/types.js';

describe('executeOffboardPipeline', () => {
  it('aborts immediately when caller matches target email (SEC-01 self-offboard)', async () => {
    const mockDeps: OffboardPipelineDeps = {
      getCallerEmail: vi.fn().mockResolvedValue('admin@example.com'),
      getTargetUser: vi.fn().mockResolvedValue({ id: '1', primaryEmail: 'admin@example.com', isAdmin: true }),
      containUser: vi.fn(),
      evictSessionsAndTokens: vi.fn(),
    };

    await expect(executeOffboardPipeline({ email: 'admin@example.com' }, mockDeps))
      .rejects.toThrow(/Cannot offboard the currently authenticated administrative account/);
    expect(mockDeps.containUser).not.toHaveBeenCalled();
  });

  it('aborts immediately when caller matches target email case-insensitively (SEC-01)', async () => {
    const mockDeps: OffboardPipelineDeps = {
      getCallerEmail: vi.fn().mockResolvedValue('Admin@Example.COM '),
      getTargetUser: vi.fn(),
      containUser: vi.fn(),
      evictSessionsAndTokens: vi.fn(),
    };

    await expect(executeOffboardPipeline({ email: ' admin@example.com' }, mockDeps))
      .rejects.toThrow(/Cannot offboard the currently authenticated administrative account/);
    expect(mockDeps.getTargetUser).not.toHaveBeenCalled();
  });

  it('throws error when target is admin and --force-admin-offboard is not passed (SEC-02)', async () => {
    const mockDeps: OffboardPipelineDeps = {
      getCallerEmail: vi.fn().mockResolvedValue('super@example.com'),
      getTargetUser: vi.fn().mockResolvedValue({ id: '2', primaryEmail: 'admin2@example.com', isAdmin: true }),
      containUser: vi.fn(),
      evictSessionsAndTokens: vi.fn(),
    };

    await expect(executeOffboardPipeline({ email: 'admin2@example.com' }, mockDeps))
      .rejects.toThrow(/Target user admin2@example.com is an Administrator\. Pass --force-admin-offboard to proceed\./);
    expect(mockDeps.containUser).not.toHaveBeenCalled();
  });

  it('throws LastAdminLockoutError when target is the sole active admin (SEC-02)', async () => {
    const mockDeps: OffboardPipelineDeps = {
      getCallerEmail: vi.fn().mockResolvedValue('super@example.com'),
      getTargetUser: vi.fn().mockResolvedValue({ id: '2', primaryEmail: 'admin2@example.com', isAdmin: true }),
      countActiveAdmins: vi.fn().mockResolvedValue(1),
      containUser: vi.fn(),
      evictSessionsAndTokens: vi.fn(),
    };

    await expect(executeOffboardPipeline({ email: 'admin2@example.com', forceAdminOffboard: true }, mockDeps))
      .rejects.toThrow(/LastAdminLockoutError: Cannot offboard admin2@example.com because they are the sole active Administrator in the domain\./);
    expect(mockDeps.containUser).not.toHaveBeenCalled();
  });

  it('demotes admin and continues if forceAdminOffboard is set and multiple admins exist (SEC-02)', async () => {
    const mockDeps: OffboardPipelineDeps = {
      getCallerEmail: vi.fn().mockResolvedValue('super@example.com'),
      getTargetUser: vi.fn().mockResolvedValue({ id: '2', primaryEmail: 'admin2@example.com', isAdmin: true }),
      countActiveAdmins: vi.fn().mockResolvedValue(3),
      demoteAdmin: vi.fn().mockResolvedValue({ success: true }),
      containUser: vi.fn().mockResolvedValue({ success: true }),
      evictSessionsAndTokens: vi.fn().mockResolvedValue({ success: true, tokensRevoked: 2 }),
    };

    const result = await executeOffboardPipeline({ email: 'admin2@example.com', forceAdminOffboard: true }, mockDeps);

    expect(result.success).toBe(true);
    expect(mockDeps.demoteAdmin).toHaveBeenCalledWith('admin2@example.com');
    expect(mockDeps.containUser).toHaveBeenCalledWith('admin2@example.com');
  });

  it('fails if demoteAdmin fails', async () => {
    const mockDeps: OffboardPipelineDeps = {
      getCallerEmail: vi.fn().mockResolvedValue('super@example.com'),
      getTargetUser: vi.fn().mockResolvedValue({ id: '2', primaryEmail: 'admin2@example.com', isAdmin: true }),
      countActiveAdmins: vi.fn().mockResolvedValue(2),
      demoteAdmin: vi.fn().mockResolvedValue({ success: false, error: 'Permission denied' }),
      containUser: vi.fn(),
      evictSessionsAndTokens: vi.fn(),
    };

    const result = await executeOffboardPipeline({ email: 'admin2@example.com', forceAdminOffboard: true }, mockDeps);

    expect(result.success).toBe(false);
    expect(mockDeps.containUser).not.toHaveBeenCalled();
    expect(result.steps).toContainEqual(expect.objectContaining({
      name: 'Demote admin privileges',
      status: 'failed',
      error: 'Permission denied',
    }));
  });

  it('executes atomic containment and evicts sessions on success', async () => {
    const onStepUpdate = vi.fn();
    const mockDeps: OffboardPipelineDeps = {
      getCallerEmail: vi.fn().mockResolvedValue('other-admin@example.com'),
      getTargetUser: vi.fn().mockResolvedValue({ id: '2', primaryEmail: 'john@example.com', isAdmin: false }),
      containUser: vi.fn().mockResolvedValue({ success: true }),
      evictSessionsAndTokens: vi.fn().mockResolvedValue({ success: true, tokensRevoked: 3 }),
      wipeUserDevices: vi.fn().mockResolvedValue({ wipedCount: 1 }),
      transferDriveFiles: vi.fn().mockResolvedValue({ success: true, transferId: 't123' }),
      removeFromAllGroups: vi.fn().mockResolvedValue({ removedCount: 2 }),
      onStepUpdate,
    };

    const result = await executeOffboardPipeline({
      email: 'john@example.com',
      wipeDevices: true,
      transferDriveTo: 'manager@example.com',
      removeFromGroups: true,
    }, mockDeps);

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(mockDeps.containUser).toHaveBeenCalledWith('john@example.com');
    expect(mockDeps.evictSessionsAndTokens).toHaveBeenCalledWith('john@example.com');
    expect(mockDeps.wipeUserDevices).toHaveBeenCalledWith('john@example.com');
    expect(mockDeps.transferDriveFiles).toHaveBeenCalledWith('john@example.com', 'manager@example.com');
    expect(mockDeps.removeFromAllGroups).toHaveBeenCalledWith('john@example.com');
    expect(onStepUpdate).toHaveBeenCalled();
  });

  it('halts Phase B if critical Phase A containment fails (SEC-04)', async () => {
    const mockDeps: OffboardPipelineDeps = {
      getCallerEmail: vi.fn().mockResolvedValue('admin@example.com'),
      getTargetUser: vi.fn().mockResolvedValue({ id: '3', primaryEmail: 'bad@example.com', isAdmin: false }),
      containUser: vi.fn().mockResolvedValue({ success: false, error: 'Google API Rate Limit' }),
      evictSessionsAndTokens: vi.fn(),
      wipeUserDevices: vi.fn(),
    };

    const result = await executeOffboardPipeline({ email: 'bad@example.com', wipeDevices: true }, mockDeps);

    expect(result.success).toBe(false);
    expect(mockDeps.evictSessionsAndTokens).not.toHaveBeenCalled();
    expect(mockDeps.wipeUserDevices).not.toHaveBeenCalled();
    expect(result.steps).toContainEqual(expect.objectContaining({
      name: 'Account containment',
      status: 'failed',
      error: 'Google API Rate Limit',
    }));
  });

  it('halts Phase B if Phase A token eviction fails (SEC-04)', async () => {
    const mockDeps: OffboardPipelineDeps = {
      getCallerEmail: vi.fn().mockResolvedValue('admin@example.com'),
      getTargetUser: vi.fn().mockResolvedValue({ id: '3', primaryEmail: 'user@example.com', isAdmin: false }),
      containUser: vi.fn().mockResolvedValue({ success: true }),
      evictSessionsAndTokens: vi.fn().mockResolvedValue({ success: false, error: 'Token revocation failed' }),
      wipeUserDevices: vi.fn(),
    };

    const result = await executeOffboardPipeline({ email: 'user@example.com', wipeDevices: true }, mockDeps);

    expect(result.success).toBe(false);
    expect(mockDeps.wipeUserDevices).not.toHaveBeenCalled();
    expect(result.steps).toContainEqual(expect.objectContaining({
      name: 'Evict sessions and OAuth tokens',
      status: 'failed',
      error: 'Token revocation failed',
    }));
  });

  it('simulates steps in dry-run mode without modifying remote resources', async () => {
    const mockDeps: OffboardPipelineDeps = {
      getCallerEmail: vi.fn().mockResolvedValue('admin@example.com'),
      getTargetUser: vi.fn().mockResolvedValue({ id: '4', primaryEmail: 'dry@example.com', isAdmin: false }),
      containUser: vi.fn(),
      evictSessionsAndTokens: vi.fn(),
      wipeUserDevices: vi.fn(),
      transferDriveFiles: vi.fn(),
      removeFromAllGroups: vi.fn(),
    };

    const result = await executeOffboardPipeline({
      email: 'dry@example.com',
      dryRun: true,
      wipeDevices: true,
      transferDriveTo: 'archive@example.com',
      removeFromGroups: true,
    }, mockDeps);

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(mockDeps.containUser).not.toHaveBeenCalled();
    expect(mockDeps.evictSessionsAndTokens).not.toHaveBeenCalled();
    expect(mockDeps.wipeUserDevices).not.toHaveBeenCalled();
    expect(result.steps.every(s => s.status === 'skipped')).toBe(true);
  });

  it('gracefully handles Phase B failures without failing Phase A containment', async () => {
    const mockDeps: OffboardPipelineDeps = {
      getCallerEmail: vi.fn().mockResolvedValue('admin@example.com'),
      getTargetUser: vi.fn().mockResolvedValue({ id: '5', primaryEmail: 'phaseb@example.com', isAdmin: false }),
      containUser: vi.fn().mockResolvedValue({ success: true }),
      evictSessionsAndTokens: vi.fn().mockResolvedValue({ success: true, tokensRevoked: 0 }),
      wipeUserDevices: vi.fn().mockRejectedValue(new Error('MDM not enrolled')),
      transferDriveFiles: vi.fn().mockRejectedValue(new Error('Destination user not found')),
      removeFromAllGroups: vi.fn().mockResolvedValue({ removedCount: 0, error: 'Group API error' }),
    };

    const result = await executeOffboardPipeline({
      email: 'phaseb@example.com',
      wipeDevices: true,
      transferDriveTo: 'missing@example.com',
      removeFromGroups: true,
    }, mockDeps);

    expect(result.success).toBe(true);
    expect(result.steps).toContainEqual(expect.objectContaining({
      name: 'Wipe mobile devices',
      status: 'skipped',
    }));
    expect(result.steps).toContainEqual(expect.objectContaining({
      name: 'Transfer Drive files',
      status: 'failed',
    }));
    expect(result.steps).toContainEqual(expect.objectContaining({
      name: 'Remove from groups',
      status: 'failed',
    }));
  });
});
