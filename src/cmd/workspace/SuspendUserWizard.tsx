import React from 'react';
import { TuiWizard } from '../tui/TuiWizard.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface SuspendUserWizardProps {
  userDeps: WorkspaceUserCommandDeps;
  prefillEmail?: string;
  onCancel?: () => void;
}

export function SuspendUserWizard({ userDeps, prefillEmail, onCancel }: SuspendUserWizardProps) {
  return (
    <TuiWizard
      title="Suspend User"
      destructive
      fields={[
        {
          key: 'email',
          label: 'Email',
          required: true,
          ...(prefillEmail ? { fixedValue: prefillEmail } : {}),
        },
      ]}
      summary={(values) => `Suspend user: ${values.email}`}
      onCancel={() => onCancel?.()}
      onSubmit={async (values) => {
        if (!userDeps.suspendUser) {
          throw new Error('suspendUser dependency function is not provided.');
        }
        const email = (values.email ?? '').trim();
        const result = await userDeps.suspendUser(email);
        if (!result.applied) {
          throw new Error('User suspension was not applied.');
        }
        return `User suspended: ${result.email}`;
      }}
    />
  );
}