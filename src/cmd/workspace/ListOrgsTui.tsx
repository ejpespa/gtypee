import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  DEFAULT_TUI_PAGE_SIZE,
  sliceLocalPage,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
import type { WorkspaceOrgUnitCommandDeps, OrgUnit } from './commands.js';

export interface ListOrgsTuiProps {
  orgDeps: WorkspaceOrgUnitCommandDeps;
  onCancel?: () => void;
}

export function ListOrgsTui({ orgDeps, onCancel }: ListOrgsTuiProps) {
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCurrentIndex(0);

    orgDeps.listOrgUnits?.()
      .then((units) => {
        if (!active) return;
        setOrgUnits(units);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to retrieve org units');
        setLoading(false);
      });

    return () => { active = false; };
  }, [orgDeps]);

  const { slice: currentViewOrgs, hasNextPage } = sliceLocalPage(orgUnits, currentIndex, DEFAULT_TUI_PAGE_SIZE);

  useInput((input, key) => {
    if (key.escape) {
      onCancel?.();
      return;
    }
    if (loading) return;

    const action = shouldHandlePaginationKey(input, key, false);
    if (action === 'next' && hasNextPage) setCurrentIndex((i) => i + 1);
    if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
  });

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
        <Box flexDirection="column" marginBottom={1}>
          {currentViewOrgs.map((ou) => (
            <Box key={ou.orgUnitId} flexDirection="column">
              <Text>
                Path: <Text color="green">{ou.orgUnitPath}</Text> (Name: <Text color="white">{ou.name}</Text>)
              </Text>
              {ou.description && (
                <Text color="gray">  Description: {ou.description}</Text>
              )}
            </Box>
          ))}
        </Box>
      )}
      <Box marginTop={1}>
        <Text color="gray">Navigation: </Text>
        <Text color={currentIndex > 0 && !loading ? 'green' : 'gray'}>[← Prev]</Text>
        <Text color="gray">  </Text>
        <Text color={hasNextPage && !loading ? 'green' : 'gray'}>[Next →]</Text>
        <Text color="gray"> | press ESC to return (Page {currentIndex + 1})</Text>
      </Box>
    </Box>
  );
}