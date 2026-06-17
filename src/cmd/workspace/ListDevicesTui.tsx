import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import {
  DEFAULT_TUI_PAGE_SIZE,
  mergeNextPageToken,
  hasNextTokenPage,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
import { filterItemsByQuery, normalizeOrgUnitPath } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListFooter } from '../tui/TuiListFooter.js';
import type { WorkspaceDeviceCommandDeps, Device } from './commands.js';

export interface ListDevicesTuiProps {
  deviceDeps: WorkspaceDeviceCommandDeps;
  type: 'chromebook' | 'mobile';
  onCancel?: () => void;
}

export function ListDevicesTui({ deviceDeps, type, onCancel }: ListDevicesTuiProps) {
  const { exit } = useApp();

  const [orgUnitDraft, setOrgUnitDraft] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedOrgPath, setAppliedOrgPath] = useState<string | undefined>(undefined);
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeField, setActiveField] = useState<'org' | 'search' | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageCache, setPageCache] = useState<Record<number, Device[]>>({});

  const pageSize = DEFAULT_TUI_PAGE_SIZE;

  const applyOrgPath = useCallback(() => {
    const trimmed = orgUnitDraft.trim();
    const newPath = trimmed ? normalizeOrgUnitPath(trimmed) : undefined;
    if (newPath !== appliedOrgPath) {
      setAppliedOrgPath(newPath);
      setPageHistory([undefined]);
      setCurrentIndex(0);
      setPageCache({});
    }
    setActiveField(null);
  }, [orgUnitDraft, appliedOrgPath]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setActiveField(null);
  }, [searchDraft]);

  useEffect(() => {
    if (pageCache[currentIndex]) {
      setLoading(false);
      return;
    }

    let isCancelled = false;

    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!deviceDeps.listDevices) {
          throw new Error('listDevices dependency function is not provided.');
        }

        const currentToken = pageHistory[currentIndex];
        const paginationOpts: import('../../types/pagination.js').PaginationOptions = {
          pageSize,
        };
        if (currentToken !== undefined) {
          paginationOpts.pageToken = currentToken;
        }

        const result = await deviceDeps.listDevices(
          { type, orgUnitPath: appliedOrgPath },
          paginationOpts,
        );

        if (!isCancelled) {
          setPageCache((prev) => ({
            ...prev,
            [currentIndex]: result.items,
          }));

          setPageHistory((prev) =>
            mergeNextPageToken(prev, currentIndex, result.nextPageToken),
          );
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch devices');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void fetchPage();
    return () => {
      isCancelled = true;
    };
  }, [currentIndex, type, deviceDeps, appliedOrgPath, pageCache, pageHistory]);

  const localHasNextPage = hasNextTokenPage(pageHistory, currentIndex);
  const currentDevices = pageCache[currentIndex] ?? [];
  const visibleDevices = filterItemsByQuery(
    currentDevices,
    appliedSearch,
    (d) => [d.email, d.modelName, d.deviceId, d.status],
  );

  useInput((input, key) => {
    if (activeField !== null) {
      if (key.escape) {
        if (activeField === 'org') {
          setOrgUnitDraft(appliedOrgPath ?? '');
        } else {
          setSearchDraft(appliedSearch);
        }
        setActiveField(null);
        return;
      }
      if (key.tab) {
        setActiveField(activeField === 'org' ? 'search' : 'org');
      }
      return;
    }

    if (input === 'q' || key.escape) {
      if (onCancel) {
        return onCancel();
      }
      exit();
      return;
    }

    if (input === 'f' || input === '/') {
      setActiveField('org');
      return;
    }

    if (input === 's') {
      setActiveField('search');
      return;
    }

    if (loading) return;

    const action = shouldHandlePaginationKey(input, key, false);
    if (action === 'next' && localHasNextPage) setCurrentIndex((i) => i + 1);
    if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
  });

  const titleType = type === 'chromebook' ? 'ChromeOS' : 'Mobile';
  const orgDisplay = appliedOrgPath ?? '(all orgs)';

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box flexShrink={0} marginBottom={1}>
        <Text bold color="cyan">
          Workspace Admin: {titleType} Devices (page {currentIndex + 1} · org {orgDisplay})
        </Text>
      </Box>

      <Box flexDirection="column" flexShrink={0} marginBottom={1}>
        <Box>
          <Text color={activeField === 'org' ? 'cyan' : 'gray'}>Org unit: </Text>
          {activeField === 'org' ? (
            <TextInput
              value={orgUnitDraft}
              onChange={setOrgUnitDraft}
              onSubmit={applyOrgPath}
              placeholder="(empty = all orgs)"
            />
          ) : (
            <Text color="green">{orgUnitDraft.trim() ? orgUnitDraft : '(all orgs)'}</Text>
          )}
        </Box>
        <TuiSearchControls
          appliedSearch={appliedSearch}
          searchDraft={searchDraft}
          isEditing={activeField === 'search'}
          onDraftChange={setSearchDraft}
          onSubmit={applySearch}
          hint="f or / = org unit · s = search · Enter applies · Tab switches field · ESC cancels edit · filters current page"
        />
      </Box>

      {error && (
        <Box flexShrink={0} marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      <Box flexDirection="column" flexGrow={1} marginBottom={1}>
        {loading && currentDevices.length === 0 ? (
          <Text color="yellow">Loading devices from Google Workspace API...</Text>
        ) : currentDevices.length === 0 ? (
          <Text color="gray">No devices found on this page.</Text>
        ) : visibleDevices.length === 0 ? (
          <Text color="gray">
            {appliedSearch
              ? `No devices match "${appliedSearch}" on this page. Try Next → or clear search.`
              : 'No devices found on this page.'}
          </Text>
        ) : (
          <SelectInput
            items={visibleDevices.map((d) => {
              const label = `Model: ${d.modelName || 'Unknown'} | OS: ${d.osVersion || 'Unknown'} | Sync: ${d.lastSync || 'Never'}`;
              return { label, value: d.deviceId };
            })}
            onSelect={() => {}}
          />
        )}
      </Box>

      <TuiListFooter
        currentIndex={currentIndex}
        hasNextPage={localHasNextPage}
        loading={loading}
        backHint="press 'q' or ESC to return"
      />
    </Box>
  );
}