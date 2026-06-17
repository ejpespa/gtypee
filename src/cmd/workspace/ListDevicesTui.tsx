import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import type { WorkspaceDeviceCommandDeps, Device } from './commands.js';

export interface ListDevicesTuiProps {
  deviceDeps: WorkspaceDeviceCommandDeps;
  type: 'chromebook' | 'mobile';
  onCancel?: () => void;
}

export function ListDevicesTui({ deviceDeps, type, onCancel }: ListDevicesTuiProps) {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // pageHistory holds tokens. pageHistory[0] is the initial token (undefined for first page).
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Cache results internally logic buffering allFetchedDevices chunks natively.
  const [allFetchedDevices, setAllFetchedDevices] = useState<{ [page: number]: Device[] }>({});

  const pageSize = 20;

  useEffect(() => {
    let isCancelled = false;

    // If already cached, don't fetch again
    if (allFetchedDevices[currentIndex]) {
      return;
    }

    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!deviceDeps.listDevices) {
          throw new Error('listDevices dependency function is not provided.');
        }

        const currentToken = pageHistory[currentIndex];
        const paginationOpts: import('../../types/pagination.js').PaginationOptions = {
          pageSize
        };
        if (currentToken !== undefined) {
          paginationOpts.pageToken = currentToken;
        }

        const result = await deviceDeps.listDevices(
          { type },
          paginationOpts
        );

        if (!isCancelled) {
          setAllFetchedDevices(prev => ({
            ...prev,
            [currentIndex]: result.items,
          }));

          if (result.nextPageToken) {
            setPageHistory(prev => {
              const next = [...prev];
              next[currentIndex + 1] = result.nextPageToken;
              return next;
            });
          } else {
            setPageHistory(prev => {
              const next = [...prev];
              if (next.length > currentIndex + 1) {
                next[currentIndex + 1] = undefined;
              }
              return next;
            });
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Failed to fetch devices');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchPage();
    return () => {
      isCancelled = true;
    };
  }, [currentIndex, type, deviceDeps]);

  const localHasNextPage = pageHistory[currentIndex + 1] !== undefined;
  const currentDevices = allFetchedDevices[currentIndex] || [];

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      if (onCancel) {
        return onCancel();
      }
      exit();
      return;
    }

    if (!loading) {
      if ((key.rightArrow || input === ' ') && localHasNextPage) {
        setCurrentIndex(prev => prev + 1);
      }
      if (key.leftArrow && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }
  });

  const titleType = type === 'chromebook' ? 'ChromeOS' : 'Mobile';

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Workspace Admin: {titleType} Devices (Page {currentIndex + 1})</Text>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {loading && currentDevices.length === 0 ? (
        <Text color="yellow">Loading devices from Google Workspace API...</Text>
      ) : currentDevices.length === 0 ? (
        <Text color="gray">No devices found on this page.</Text>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          <SelectInput
            items={currentDevices.map(d => {
              const label = `Model: ${d.modelName || 'Unknown'} | OS: ${d.osVersion || 'Unknown'} | Sync: ${d.lastSync || 'Never'}`;
              return { label, value: d.deviceId };
            })}
            onSelect={() => {}}
          />
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">Navigation: </Text>
        <Text color={currentIndex > 0 && !loading ? "green" : "gray"}>[← Prev]</Text>
        <Text color="gray">  </Text>
        <Text color={localHasNextPage && !loading ? "green" : "gray"}>[Next →]</Text>
        <Text color="gray"> | press 'q' or ESC to return{loading ? ' | Loading...' : ''}</Text>
      </Box>
    </Box>
  );
}
