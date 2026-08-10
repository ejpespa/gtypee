import React from 'react';
import { TuiWizard } from '../tui/TuiWizard.js';
import { buildRecoveryInfoPatch } from './recoveryInfo.js';
import type { UserRecoveryInfo, WorkspaceUserCommandDeps } from './commands.js';

export interface RecoveryInfoWizardProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  email: string;
  current: UserRecoveryInfo;
  onSaved?: (info: { recoveryEmail?: string; recoveryPhone?: string }) => void;
  onCancel?: () => void;
}

export function RecoveryInfoWizard({ userDeps, email, current, onSaved, onCancel }: RecoveryInfoWizardProps) {
  return (
    <TuiWizard
      title="Recovery Info"
      fields={[
        {
          key: 'recoveryEmail',
          label: 'Recovery email',
          placeholder: current.recoveryEmail ?? 'none (blank = keep current)',
        },
        {
          key: 'recoveryPhone',
          label: 'Recovery phone',
          placeholder: current.recoveryPhone ?? 'none (blank = keep current)',
        },
      ]}
      summary={(values) => {
        const patch = buildRecoveryInfoPatch(values) as
          | { recoveryEmail?: string; recoveryPhone?: string }
          | null;
        if (!patch) return 'No changes — current recovery info will be kept.';
        return [
          `Update recovery info for ${email}`,
          patch.recoveryEmail ? `Recovery email: ${patch.recoveryEmail}` : 'Recovery email: (unchanged)',
          patch.recoveryPhone ? `Recovery phone: ${patch.recoveryPhone}` : 'Recovery phone: (unchanged)',
        ].join('\n');
      }}
      onCancel={() => onCancel?.()}
      onSubmit={async (values) => {
        const patch = buildRecoveryInfoPatch(values) as
          | { recoveryEmail?: string; recoveryPhone?: string }
          | null;
        if (!patch) {
          return `No changes made for ${email}.`;
        }
        const result = await userDeps.setRecoveryInfo(email, patch);
        if (!result.applied) {
          throw new Error('Recovery info update was not applied.');
        }
        onSaved?.(patch);
        return [
          `Recovery info updated for ${result.email}`,
          result.recoveryEmail ? `Email: ${result.recoveryEmail}` : null,
          result.recoveryPhone ? `Phone: ${result.recoveryPhone}` : null,
        ].filter(Boolean).join('\n');
      }}
    />
  );
}
