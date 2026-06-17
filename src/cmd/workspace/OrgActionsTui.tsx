import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { TuiConfirmPrompt } from '../tui/TuiConfirmPrompt.js';
import { TuiScreenShell } from '../tui/TuiScreenShell.js';
import { TuiKeybar } from '../tui/TuiKeybar.js';
import { TuiWizard } from '../tui/TuiWizard.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { translateApiError } from '../tui/translateApiError.js';
import type { UpdateOrgUnitInput, WorkspaceOrgUnitCommandDeps } from './commands.js';

export interface OrgActionsTuiProps {
  orgDeps: WorkspaceOrgUnitCommandDeps;
  prefillOrgUnitPath?: string;
  onCancel?: () => void;
}

type ConfirmPhase = 'confirm' | 'running' | 'result';

interface PrefillConfirmActionProps {
  title: string;
  message: string;
  destructive?: boolean;
  onAction: () => Promise<string>;
  onCancel: () => void;
}

function PrefillConfirmAction({
  title,
  message,
  destructive = false,
  onAction,
  onCancel,
}: PrefillConfirmActionProps) {
  const [phase, setPhase] = useState<ConfirmPhase>('confirm');
  const [resultMessage, setResultMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useInput((_input, key) => {
    if (phase === 'result' && key.escape) {
      onCancel();
    }
  });

  if (phase === 'running') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="yellow">
        <Text bold color="cyan">{title}</Text>
        <Text color="yellow">Working...</Text>
      </Box>
    );
  }

  if (phase === 'result') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="green">
        <Text bold color="cyan">{title}</Text>
        <Text color="green">{resultMessage}</Text>
        <Box marginTop={1}>
          <Text color="gray">ESC to close</Text>
        </Box>
      </Box>
    );
  }

  const displayMessage = errorMessage ? `${message}\n\nPrevious error: ${errorMessage}` : message;

  return (
    <TuiConfirmPrompt
      title={title}
      message={displayMessage}
      {...(destructive ? { destructive: true } : {})}
      onCancel={onCancel}
      onConfirm={async () => {
        setPhase('running');
        setErrorMessage(null);
        try {
          const msg = await onAction();
          setResultMessage(msg);
          setPhase('result');
        } catch (err: unknown) {
          setErrorMessage(translateApiError(err));
          setPhase('confirm');
        }
      }}
    />
  );
}

export function OrgActionsTui({ orgDeps, prefillOrgUnitPath, onCancel }: OrgActionsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();
  const [activeView, setActiveView] = useState<string | null>(null);

  useEffect(() => {
    if (activeView === null) {
      setBreadcrumbs(['Workspace', 'Org Units', 'Actions']);
      setHelpLines(['↑/↓ select · Enter open · ESC back']);
    }
  }, [activeView, setBreadcrumbs, setHelpLines]);

  const items = [
    { label: 'Update Org Unit', value: 'update-org' },
    { label: 'Delete Org Unit', value: 'delete-org' },
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveView(item.value);
  };

  useInput((_input, key) => {
    if (activeView === null && key.escape) {
      onCancel?.();
      return;
    }
    if (activeView !== null && key.escape) {
      setActiveView(null);
    }
  });

  const backToMenu = () => setActiveView(null);

  if (activeView === 'update-org') {
    if (!prefillOrgUnitPath) {
      return (
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor="red">
          <Text bold color="cyan">Update Org Unit</Text>
          <Text color="red">Org unit path is required. Open actions from an org unit row.</Text>
          <Box marginTop={1}>
            <Text color="gray">ESC to return</Text>
          </Box>
        </Box>
      );
    }

    return (
      <TuiWizard
        title="Update Org Unit"
        fields={[
          {
            key: 'name',
            label: 'Name',
            placeholder: 'Leave empty to keep unchanged',
          },
          {
            key: 'description',
            label: 'Description',
            placeholder: 'Leave empty to keep unchanged',
          },
        ]}
        summary={(values) => [
          `Org unit: ${prefillOrgUnitPath}`,
          `Name: ${values.name?.trim() || '(unchanged)'}`,
          `Description: ${values.description?.trim() || '(unchanged)'}`,
        ].join('\n')}
        onCancel={backToMenu}
        onSubmit={async (values) => {
          if (!orgDeps.updateOrgUnit) {
            throw new Error('updateOrgUnit is not available');
          }

          const name = values.name?.trim();
          const description = values.description?.trim();
          if (!name && !description) {
            throw new Error('At least one of name or description is required');
          }

          const input: UpdateOrgUnitInput = {};
          if (name) input.name = name;
          if (description) input.description = description;

          const result = await orgDeps.updateOrgUnit(prefillOrgUnitPath, input);
          if (!result.applied) {
            throw new Error('Failed to update org unit');
          }
          return `Org unit updated: ${result.name} (ID: ${result.orgUnitId})`;
        }}
      />
    );
  }

  if (activeView === 'delete-org') {
    if (!prefillOrgUnitPath) {
      return (
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor="red">
          <Text bold color="cyan">Delete Org Unit</Text>
          <Text color="red">Org unit path is required. Open actions from an org unit row.</Text>
          <Box marginTop={1}>
            <Text color="gray">ESC to return</Text>
          </Box>
        </Box>
      );
    }

    return (
      <PrefillConfirmAction
        title="Delete Org Unit"
        message={`Permanently delete org unit ${prefillOrgUnitPath}? This cannot be undone.`}
        destructive
        onCancel={backToMenu}
        onAction={async () => {
          if (!orgDeps.deleteOrgUnit) {
            throw new Error('deleteOrgUnit is not available');
          }
          const result = await orgDeps.deleteOrgUnit(prefillOrgUnitPath);
          if (!result.applied) {
            throw new Error('Failed to delete org unit');
          }
          return `Org unit deleted: ${result.orgUnitPath}`;
        }}
      />
    );
  }

  const subtitle = prefillOrgUnitPath ? prefillOrgUnitPath : undefined;

  return (
    <TuiScreenShell
      title="Org Unit Actions"
      {...(subtitle ? { subtitle } : {})}
    >
      <SelectInput items={items} onSelect={handleSelect} />
      <TuiKeybar detailEnabled={false} refreshEnabled={false} />
    </TuiScreenShell>
  );
}