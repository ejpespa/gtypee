import React from 'react';
import { TuiWizard } from '../tui/TuiWizard.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface DeletePhotoWizardProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  onCancel?: () => void;
}

export function DeletePhotoWizard({ userDeps, onCancel }: DeletePhotoWizardProps) {
  return (
    <TuiWizard
      title="Delete Photo"
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
        const result = await userDeps.deletePhoto((values.email ?? '').trim());
        if (!result.applied) {
          throw new Error('Failed to delete photo');
        }
        return `Photo deleted for ${result.email}`;
      }}
    />
  );
}