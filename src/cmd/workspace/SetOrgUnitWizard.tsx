import React from 'react';
import { TuiWizard } from '../tui/TuiWizard.js';
import { normalizeOrgUnitPath } from '../tui/search.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface SetOrgUnitWizardProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  prefillEmail?: string;
  onCancel?: () => void;
}

export function SetOrgUnitWizard({ userDeps, prefillEmail, onCancel }: SetOrgUnitWizardProps) {
  return (
    <TuiWizard
      title="Set Org Unit"
      fields={[
        {
          key: 'email',
          label: 'Email',
          required: true,
          ...(prefillEmail ? { fixedValue: prefillEmail } : {}),
        },
        {
          key: 'orgUnitPath',
          label: 'Org Unit Path',
          required: true,
          placeholder: '/Sales',
        },
      ]}
      onCancel={() => onCancel?.()}
      onSubmit={async (values) => {
        const result = await userDeps.setOrgUnit(
          (values.email ?? '').trim(),
          normalizeOrgUnitPath(values.orgUnitPath ?? ''),
        );
        if (!result.applied) {
          throw new Error('Failed to set org unit');
        }
        return `Org unit set for ${result.email}: ${result.orgUnitPath}`;
      }}
    />
  );
}