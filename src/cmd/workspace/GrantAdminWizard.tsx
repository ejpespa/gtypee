import React from 'react';
import { TuiWizard } from '../tui/TuiWizard.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface GrantAdminWizardProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  onCancel?: () => void;
}

export function GrantAdminWizard({ userDeps, onCancel }: GrantAdminWizardProps) {
  return (
    <TuiWizard
      title="Grant Admin"
      fields={[
        {
          key: 'email',
          label: 'Email',
          required: true,
        },
      ]}
      onCancel={() => onCancel?.()}
      onSubmit={async (values) => {
        const result = await userDeps.setAdmin((values.email ?? '').trim(), true);
        if (!result.applied) {
          throw new Error('Failed to grant admin privileges');
        }
        return `Admin privileges granted to ${result.email}`;
      }}
    />
  );
}