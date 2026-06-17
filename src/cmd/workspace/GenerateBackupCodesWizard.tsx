import React from 'react';
import { TuiWizard } from '../tui/TuiWizard.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface GenerateBackupCodesWizardProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  prefillEmail?: string;
  onCancel?: () => void;
}

export function GenerateBackupCodesWizard({ userDeps, prefillEmail, onCancel }: GenerateBackupCodesWizardProps) {
  return (
    <TuiWizard
      title="Generate Backup Codes"
      sensitiveResult
      fields={[
        {
          key: 'email',
          label: 'Email',
          required: true,
          ...(prefillEmail ? { initialValue: prefillEmail } : {}),
        },
      ]}
      summary={(values) => [
        `Generate backup codes for ${values.email}`,
        'Existing unused codes may be invalidated.',
        'User must have 2-Step Verification enabled.',
      ].join('\n')}
      onCancel={() => onCancel?.()}
      onSubmit={async (values) => {
        const email = (values.email ?? '').trim();
        const result = await userDeps.generateBackupCodes(email);
        if (!result.applied || result.codes.length === 0) {
          throw new Error(
            result.error ?? 'Backup codes were not generated. Ensure 2-Step Verification is enabled for this user.',
          );
        }
        return result.codes.join('\n');
      }}
    />
  );
}