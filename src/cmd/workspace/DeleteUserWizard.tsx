import React from 'react';
import { TuiWizard } from '../tui/TuiWizard.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface DeleteUserWizardProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  prefillEmail?: string;
  onCancel?: () => void;
}

export function DeleteUserWizard({ userDeps, prefillEmail, onCancel }: DeleteUserWizardProps) {
  return (
    <TuiWizard
      title="Delete User"
      destructive
      fields={[
        {
          key: 'email',
          label: 'Email',
          required: true,
          ...(prefillEmail ? { fixedValue: prefillEmail } : {}),
        },
        {
          key: 'confirmEmail',
          label: 'Type email again to confirm deletion',
          required: true,
        },
      ]}
      summary={(values) => `Delete user: ${values.email}\nConfirm: ${values.confirmEmail}`}
      onCancel={() => onCancel?.()}
      onSubmit={async (values) => {
        const email = (values.email ?? '').trim();
        const confirmEmail = (values.confirmEmail ?? '').trim();
        if (email !== confirmEmail) {
          throw new Error('Confirmation email does not match');
        }
        const result = await userDeps.deleteUser(email);
        if (!result.applied) {
          throw new Error('Failed to delete user');
        }
        return `User deleted: ${result.email}`;
      }}
    />
  );
}