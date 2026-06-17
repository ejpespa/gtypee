import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { ListFilesTui } from '../drive/ListFilesTui.js';
import { ListTrashTui } from '../drive/ListTrashTui.js';
import { ListSharedDrivesTui } from '../drive/ListSharedDrivesTui.js';
import { TuiWizard } from './TuiWizard.js';
import type { DriveCommandDeps, DriveSharedDrivesDeps, DriveTrashDeps } from '../drive/commands.js';

interface DriveRouterProps {
  deps: Required<DriveCommandDeps>;
  trashDeps: Required<DriveTrashDeps>;
  sharedDrivesDeps: Required<DriveSharedDrivesDeps>;
  onCancel: () => void;
}

export function DriveRouter({ deps, trashDeps, sharedDrivesDeps, onCancel }: DriveRouterProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const items = [
    { label: 'Files', value: 'files' },
    { label: 'Upload File', value: 'upload' },
    { label: 'New Folder', value: 'mkdir' },
    { label: 'Trash', value: 'trash' },
    { label: 'Shared Drives', value: 'shared-drives' },
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveSubMenu(item.value);
  };

  useInput((_input, key) => {
    if (activeSubMenu === null && key.escape) {
      onCancel();
    }
  });

  if (activeSubMenu === 'files') {
    return (
      <ListFilesTui
        driveDeps={deps}
        title="Files"
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'upload') {
    return (
      <TuiWizard
        title="Upload file"
        fields={[
          { key: 'path', label: 'Local file path', required: true, placeholder: 'C:\\path\\to\\file.pdf' },
        ]}
        summary={(values) => `Upload ${values.path}`}
        onCancel={() => setActiveSubMenu(null)}
        onSubmit={async (values) => {
          const result = await deps.uploadFile(values.path ?? '');
          if (!result.uploaded) throw new Error(`Upload failed for ${values.path}`);
          return `Uploaded ${result.name} (id=${result.id || 'unknown'})`;
        }}
      />
    );
  }

  if (activeSubMenu === 'mkdir') {
    return (
      <TuiWizard
        title="New folder"
        fields={[
          { key: 'name', label: 'Folder name', required: true },
          { key: 'parentId', label: 'Parent folder ID (optional)', placeholder: 'leave empty for root' },
        ]}
        onCancel={() => setActiveSubMenu(null)}
        onSubmit={async (values) => {
          const parentId = values.parentId?.trim() || undefined;
          const result = await deps.createFolder(values.name ?? '', parentId);
          if (!result.created) throw new Error('Failed to create folder');
          return `Created folder ${result.name} (id=${result.id || 'unknown'})`;
        }}
      />
    );
  }

  if (activeSubMenu === 'trash') {
    return (
      <ListTrashTui
        trashDeps={trashDeps}
        driveDeps={deps}
        title="Trash"
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'shared-drives') {
    return (
      <ListSharedDrivesTui
        sharedDrivesDeps={sharedDrivesDeps}
        title="Shared Drives"
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Drive</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return to services</Text>
      </Box>
    </Box>
  );
}