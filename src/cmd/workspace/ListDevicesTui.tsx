import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { filterItemsByQuery, normalizeOrgUnitPath } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import type { WorkspaceDeviceCommandDeps, Device } from './commands.js';

export interface ListDevicesTuiProps {
  deviceDeps: WorkspaceDeviceCommandDeps;
  type: 'chromebook' | 'mobile';
  onCancel?: () => void;
}

function formatDeviceLabel(device: Device): string {
  return `Model: ${device.modelName || 'Unknown'} | OS: ${device.osVersion || 'Unknown'} | Sync: ${device.lastSync || 'Never'}`;
}

export function ListDevicesTui({ deviceDeps, type, onCancel }: ListDevicesTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [orgUnitDraft, setOrgUnitDraft] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedOrgPath, setAppliedOrgPath] = useState<string | undefined>(undefined);
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeField, setActiveField] = useState<'org' | 'search' | null>(null);

  const titleType = type === 'chromebook' ? 'ChromeOS' : 'Mobile';
  const queryKey = `${type}:${appliedOrgPath ?? '(all)'}`;

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      if (!deviceDeps.listDevices) {
        throw new Error('listDevices dependency function is not provided.');
      }

      const paginationOpts: import('../../types/pagination.js').PaginationOptions = {
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      };

      return deviceDeps.listDevices(
        { type, orgUnitPath: appliedOrgPath },
        paginationOpts,
      );
    },
    [appliedOrgPath, deviceDeps, type],
  );

  const {
    items: currentDevices,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey,
  });

  useEffect(() => {
    const orgDisplay = appliedOrgPath ?? '(all orgs)';
    setBreadcrumbs(['Workspace', `${titleType} Devices`]);
    setHelpLines([
      'f or / — edit org unit',
      's — search current page',
      'r — refresh list',
      'Tab — switch field while editing',
      '←/→ or Space — paginate',
      `Org: ${orgDisplay}`,
      'ESC — back',
    ]);
  }, [appliedOrgPath, setBreadcrumbs, setHelpLines, titleType]);

  const applyOrgPath = useCallback(() => {
    const trimmed = orgUnitDraft.trim();
    const newPath = trimmed ? normalizeOrgUnitPath(trimmed) : undefined;
    setAppliedOrgPath(newPath);
    setActiveField(null);
  }, [orgUnitDraft]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setActiveField(null);
  }, [searchDraft]);

  const visibleDevices = filterItemsByQuery(
    currentDevices,
    appliedSearch,
    (d) => [d.email, d.modelName, d.deviceId, d.status],
  );

  const blocked = activeField !== null;
  const orgDisplay = appliedOrgPath ?? '(all orgs)';

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

    if (key.escape) {
      onCancel?.();
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
  });

  const emptyMessage = visibleDevices.length === 0 && currentDevices.length > 0 && appliedSearch
    ? `No devices match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No devices found on this page.';

  return (
    <TuiListScreen
      title={`Workspace Admin: ${titleType} Devices`}
      pageLabel={`Page ${currentIndex + 1} · org ${orgDisplay}`}
      items={visibleDevices}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={() => {}}
      formatLabel={formatDeviceLabel}
      getId={(device) => device.deviceId}
      filterSlot={(
        <>
          <Box marginBottom={1}>
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
        </>
      )}
      emptyMessage={emptyMessage}
      onPagination={(action) => {
        if (action === 'next' && hasNextPage) setCurrentIndex((i) => i + 1);
        if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
      }}
      onRefresh={refresh}
      blocked={blocked}
    />
  );
}