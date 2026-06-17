import React from 'react';
import { ListFilesTui } from '../drive/ListFilesTui.js';
import type { DriveCommandDeps } from '../drive/commands.js';

interface DriveRouterProps {
  deps: Required<DriveCommandDeps>;
  onCancel: () => void;
}

export function DriveRouter({ deps, onCancel }: DriveRouterProps) {
  return (
    <ListFilesTui
      driveDeps={deps}
      title="Files"
      onCancel={onCancel}
    />
  );
}