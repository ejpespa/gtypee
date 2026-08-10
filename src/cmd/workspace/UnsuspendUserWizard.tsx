import React from 'react';
import { TuiWizard } from '../tui/TuiWizard.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface UnsuspendUserWizardProps {
  userDeps: WorkspaceUserCommandDeps;
  prefillEmail?: string;
  onCancel?: () => void;
}

export function UnsuspendUserWizard({ userDeps, prefillEmail, onCancel }: UnsuspendUserWizardProps) {
  return (
    <TuiWizard
      title="Unsuspend User"
      fields={[
        {
          key: 'email',
          label: 'Email',
          required: true,
          ...(prefillEmail ? { fixedValue: prefillEmail } : {}),
        },
      ]}
      summary={(values) => `Unsuspend user: ${values.email}`}
      onCancel={() => onCancel?.()}
      onSubmit={async (values) => {
        if (!userDeps.unsuspendUser) {
          throw new Error('unsuspendUser dependency function is not provided.');
        }
        const email = (values.email ?? '').trim();
        const result = await userDeps.unsuspendUser(email);
        if (!result.applied) {
          throw new Error('User unsuspension was not applied.');
        }
        return `User unsuspended: ${result.email}`;
      }}
    />
  );
}