import React from 'react';
import { TuiWizard } from '../tui/TuiWizard.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface ResetPasswordWizardProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  prefillEmail?: string;
  onCancel?: () => void;
}

export function ResetPasswordWizard({ userDeps, prefillEmail, onCancel }: ResetPasswordWizardProps) {
  return (
    <TuiWizard
      title="Reset Password"
      sensitiveResult
      fields={[
        {
          key: 'email',
          label: 'Email',
          required: true,
          ...(prefillEmail ? { initialValue: prefillEmail } : {}),
        },
      ]}
      summary={(values) => `Reset password for ${values.email}\nA new 16-character password will be generated.`}
      onCancel={() => onCancel?.()}
      onSubmit={async (values) => {
        const email = (values.email ?? '').trim();
        const result = await userDeps.resetPassword(email);
        if (!result.applied || !result.newPassword) {
          throw new Error('Password reset was not applied.');
        }
        return `Password reset for ${result.email}\n\n${result.newPassword}`;
      }}
    />
  );
}