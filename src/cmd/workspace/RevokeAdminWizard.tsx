import React from 'react';
import { TuiWizard } from '../tui/TuiWizard.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface RevokeAdminWizardProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  onCancel?: () => void;
}

export function RevokeAdminWizard({ userDeps, onCancel }: RevokeAdminWizardProps) {
  return (
    <TuiWizard
      title="Revoke Admin"
      destructive
      fields={[
        {
          key: 'email',
          label: 'Email',
          required: true,
        },
      ]}
      onCancel={() => onCancel?.()}
      onSubmit={async (values) => {
        const result = await userDeps.setAdmin((values.email ?? '').trim(), false);
        if (!result.applied) {
          throw new Error('Failed to revoke admin privileges');
        }
        return `Admin privileges revoked for ${result.email}`;
      }}
    />
  );
}