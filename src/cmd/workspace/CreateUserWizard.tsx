import React from 'react';
import { TuiWizard } from '../tui/TuiWizard.js';
import { normalizeOrgUnitPath } from '../tui/search.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface CreateUserWizardProps {
  userDeps: WorkspaceUserCommandDeps;
  onCancel?: () => void;
}

export function CreateUserWizard({ userDeps, onCancel }: CreateUserWizardProps) {
  return (
    <TuiWizard
      title="Create User"
      sensitiveResult
      fields={[
        {
          key: 'givenName',
          label: 'Given Name',
          required: true,
        },
        {
          key: 'familyName',
          label: 'Family Name',
          required: true,
        },
        {
          key: 'primaryEmail',
          label: 'Primary Email',
          required: true,
        },
        {
          key: 'password',
          label: 'Password (optional — auto-generated if empty)',
          placeholder: 'Leave empty to auto-generate',
        },
        {
          key: 'orgUnit',
          label: 'Org Unit',
          placeholder: '/',
        },
      ]}
      summary={(values) => {
        const password = (values.password ?? '').trim();
        return [
          `Given name: ${values.givenName}`,
          `Family name: ${values.familyName}`,
          `Email: ${values.primaryEmail}`,
          `Password: ${password ? '*'.repeat(password.length) : '(auto-generated)'}`,
          `Org unit: ${normalizeOrgUnitPath(values.orgUnit ?? '')}`,
        ].join('\n');
      }}
      onCancel={() => onCancel?.()}
      onSubmit={async (values) => {
        if (!userDeps.createUser) {
          throw new Error('createUser dependency function is not provided.');
        }

        const password = (values.password ?? '').trim();
        if (password && password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }

        const result = await userDeps.createUser({
          email: (values.primaryEmail ?? '').trim(),
          firstName: (values.givenName ?? '').trim(),
          lastName: (values.familyName ?? '').trim(),
          password: password || (undefined as unknown as string),
          orgUnitPath: normalizeOrgUnitPath(values.orgUnit ?? ''),
        });

        if (!result.applied) {
          throw new Error('User creation was not applied.');
        }

        return [
          `User created: ${result.primaryEmail}`,
          `User ID: ${result.userId}`,
          '',
          result.password,
        ].join('\n');
      }}
    />
  );
}