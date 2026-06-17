import React from 'react';
import { TuiWizard } from '../tui/TuiWizard.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface AddAliasWizardProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  prefillEmail?: string;
  onCancel?: () => void;
}

export function AddAliasWizard({ userDeps, prefillEmail, onCancel }: AddAliasWizardProps) {
  return (
    <TuiWizard
      title="Add Alias"
      fields={[
        {
          key: 'email',
          label: 'User Email',
          required: true,
          ...(prefillEmail ? { initialValue: prefillEmail } : {}),
        },
        {
          key: 'alias',
          label: 'Alias Email',
          required: true,
          placeholder: 'alias@domain.com',
        },
      ]}
      onCancel={() => onCancel?.()}
      onSubmit={async (values) => {
        const result = await userDeps.addAlias(
          (values.email ?? '').trim(),
          (values.alias ?? '').trim(),
        );
        if (!result.applied) {
          throw new Error('Failed to add alias');
        }
        return `Alias added: ${result.alias}`;
      }}
    />
  );
}