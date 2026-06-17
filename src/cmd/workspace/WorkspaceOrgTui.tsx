import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { CreateOrgWizard } from './CreateOrgWizard.js';
import type { WorkspaceOrgUnitCommandDeps, OrgUnit } from './commands.js';

export interface WorkspaceOrgTuiProps {
  orgDeps: WorkspaceOrgUnitCommandDeps;
  onCancel?: () => void;
}

export function WorkspaceOrgTui({ orgDeps, onCancel }: WorkspaceOrgTuiProps) {
  const [activeView, setActiveView] = useState<string | null>(null);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = [
    { label: 'List Org Units', value: 'list-orgs' },
    { label: 'Create Org Unit', value: 'create-org' },
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveView(item.value);
  };

  useEffect(() => {
    if (activeView === 'list-orgs') {
      let active = true;
      setLoading(true);
      setError(null);
      orgDeps.listOrgUnits?.()
        .then((units) => {
          if (active) {
            setOrgUnits(units);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (active) {
            setError(err.message || 'Failed to retrieve org units');
            setLoading(false);
          }
        });
      return () => {
        active = false;
      };
    }
  }, [activeView, orgDeps]);

  useInput((_input, key) => {
    if (activeView === null && key.escape) {
      if (onCancel) {
        onCancel();
      }
    } else if (activeView !== null && key.escape) {
      setActiveView(null);
    }
  });

  if (activeView === 'create-org') {
    return (
      <CreateOrgWizard
        orgDeps={orgDeps}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'list-orgs') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
        <Box marginBottom={1}>
          <Text bold color="cyan">Organizational Units</Text>
        </Box>
        {loading ? (
          <Text color="yellow">Loading organizational units...</Text>
        ) : error ? (
          <Text color="red">Error: {error}</Text>
        ) : orgUnits.length === 0 ? (
          <Text color="gray">No organizational units found.</Text>
        ) : (
          orgUnits.map((ou) => (
            <Box key={ou.orgUnitId} flexDirection="column">
              <Text>
                Path: <Text color="green">{ou.orgUnitPath}</Text> (Name: <Text color="white">{ou.name}</Text>)
              </Text>
              {ou.description && (
                <Text color="gray">  Description: {ou.description}</Text>
              )}
            </Box>
          ))
        )}
        <Box marginTop={1}>
          <Text color="gray">Press ESC to return</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Workspace Org Unit Management</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return</Text>
      </Box>
    </Box>
  );
}
