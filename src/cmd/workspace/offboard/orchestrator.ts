import type { OffboardUserOptions, OffboardSummary, OffboardPipelineDeps, OffboardStepResult } from './types.js';

export async function executeOffboardPipeline(
  options: OffboardUserOptions,
  deps: OffboardPipelineDeps
): Promise<OffboardSummary> {
  const targetEmail = options.email.trim().toLowerCase();

  // SEC-01: Self-Offboard Guard
  const callerEmail = (await deps.getCallerEmail()).trim().toLowerCase();
  if (callerEmail === targetEmail) {
    throw new Error(`SelfOffboardBlockedError: Cannot offboard the currently authenticated administrative account (${callerEmail}).`);
  }

  // Preflight target validation
  const target = await deps.getTargetUser(targetEmail);

  // SEC-02: Super-Admin Guard
  if (target.isAdmin) {
    if (!options.forceAdminOffboard) {
      throw new Error(`Target user ${targetEmail} is an Administrator. Pass --force-admin-offboard to proceed.`);
    }
    if (deps.countActiveAdmins) {
      const activeAdmins = await deps.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new Error(`LastAdminLockoutError: Cannot offboard ${targetEmail} because they are the sole active Administrator in the domain.`);
      }
    }
  }

  const steps: OffboardStepResult[] = [];
  const reportStep = (step: OffboardStepResult) => {
    steps.push(step);
    deps.onStepUpdate?.(step);
  };

  if (options.dryRun) {
    return {
      email: targetEmail,
      dryRun: true,
      success: true,
      completedAt: new Date().toISOString(),
      steps: [
        { name: 'Self-offboard check', status: 'skipped', detail: '[Dry Run] Caller identity verified' },
        { name: 'Account containment (suspend + scramble password)', status: 'skipped', detail: '[Dry Run] Would suspend and randomize password' },
        { name: 'Evict sessions and OAuth tokens', status: 'skipped', detail: '[Dry Run] Would revoke web sessions, 2FA codes, and OAuth grants' },
        { name: 'Wipe mobile devices', status: 'skipped', detail: '[Dry Run] Would issue selective wipe' },
        { name: 'Transfer Drive files', status: 'skipped', detail: options.transferDriveTo ? `[Dry Run] Would enqueue transfer to ${options.transferDriveTo}` : 'No destination specified' },
        { name: 'Remove from groups', status: 'skipped', detail: '[Dry Run] Would remove from all distribution groups' },
      ],
    };
  }

  // Pre-Step: Demote admin if target was admin
  if (target.isAdmin && deps.demoteAdmin) {
    const demoteRes = await deps.demoteAdmin(targetEmail);
    if (!demoteRes.success) {
      reportStep({ name: 'Demote admin privileges', status: 'failed', error: demoteRes.error });
      return { email: targetEmail, dryRun: false, success: false, completedAt: new Date().toISOString(), steps };
    }
    reportStep({ name: 'Demote admin privileges', status: 'success' });
  }

  // PHASE A: Critical Security Containment (Fail-fast boundary)
  const containRes = await deps.containUser(targetEmail);
  if (!containRes.success) {
    reportStep({ name: 'Account containment', status: 'failed', error: containRes.error });
    return { email: targetEmail, dryRun: false, success: false, completedAt: new Date().toISOString(), steps };
  }
  reportStep({ name: 'Account containment', status: 'success', detail: 'Suspended, password randomized, recovery cleared' });

  const evictRes = await deps.evictSessionsAndTokens(targetEmail);
  if (!evictRes.success) {
    reportStep({ name: 'Evict sessions and OAuth tokens', status: 'failed', error: evictRes.error });
    return { email: targetEmail, dryRun: false, success: false, completedAt: new Date().toISOString(), steps };
  }
  reportStep({ name: 'Evict sessions and OAuth tokens', status: 'success', detail: `Revoked web sessions & ${evictRes.tokensRevoked ?? 0} app tokens` });

  // PHASE B: Resource Delegation & Cleanup (Non-fatal)
  if (options.wipeDevices && deps.wipeUserDevices) {
    try {
      const wipeRes = await deps.wipeUserDevices(targetEmail);
      reportStep({
        name: 'Wipe mobile devices',
        status: wipeRes.error ? 'skipped' : 'success',
        detail: wipeRes.error ? `Skipped: ${wipeRes.error}` : `Selective wipe sent to ${wipeRes.wipedCount} devices`,
      });
    } catch (err) {
      reportStep({ name: 'Wipe mobile devices', status: 'skipped', detail: `Device wipe skipped: ${String(err)}` });
    }
  }

  if (options.transferDriveTo && deps.transferDriveFiles) {
    try {
      const transferRes = await deps.transferDriveFiles(targetEmail, options.transferDriveTo);
      reportStep({
        name: 'Transfer Drive files',
        status: transferRes.success ? 'success' : 'failed',
        detail: transferRes.transferId ? `Transfer queued (ID: ${transferRes.transferId})` : undefined,
        error: transferRes.error,
      });
    } catch (err) {
      reportStep({ name: 'Transfer Drive files', status: 'failed', error: String(err) });
    }
  }

  if (options.removeFromGroups && deps.removeFromAllGroups) {
    try {
      const groupRes = await deps.removeFromAllGroups(targetEmail);
      reportStep({
        name: 'Remove from groups',
        status: groupRes.error ? 'failed' : 'success',
        detail: `Removed from ${groupRes.removedCount} groups`,
        error: groupRes.error,
      });
    } catch (err) {
      reportStep({ name: 'Remove from groups', status: 'failed', error: String(err) });
    }
  }

  return {
    email: targetEmail,
    dryRun: false,
    success: true,
    completedAt: new Date().toISOString(),
    steps,
  };
}
