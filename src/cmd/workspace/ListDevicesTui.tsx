import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { filterItemsByQuery, normalizeOrgUnitPath } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { copyToClipboard } from '../tui/systemActions.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { DeviceActionsTui } from './DeviceActionsTui.js';
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
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [actionsDeviceId, setActionsDeviceId] = useState<string | null>(null);

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

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    const orgDisplay = appliedOrgPath ?? '(all orgs)';
    setBreadcrumbs(['Workspace', `${titleType} Devices`]);
    setHelpLines([
      'f or / — edit org unit',
      's — search current page',
      'r — refresh list',
      'Enter — view device',
      'c/a — actions in detail',
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

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setSelectedDevice(null);
  }, [actions, detail]);

  const openDeviceActions = useCallback((deviceId: string) => {
    clearDetail();
    setActionsDeviceId(deviceId);
  }, [clearDetail]);

  const handleSelectDevice = useCallback(async (deviceId: string) => {
    const device = visibleDevices.find((d) => d.deviceId === deviceId);
    if (!device) return;

    actions.resetStatus();
    setSelectedDevice(device);

    await detail.open({
      title: device.modelName || device.deviceId,
      load: async () => [
        `Model: ${device.modelName || '(unknown)'}`,
        `OS: ${device.osVersion || '(unknown)'}`,
        `User: ${device.email || '(none)'}`,
        `Serial: ${device.deviceId}`,
        `Status: ${device.status || '(unknown)'}`,
        `Last sync: ${device.lastSync || 'Never'}`,
      ],
    });
  }, [actions, detail, visibleDevices]);

  const detailPanelActions = useMemo((): TuiDetailAction[] => {
    if (!selectedDevice) return [];

    return [
      {
        key: 'c',
        label: 'copy device ID',
        onAction: () => actions.runAction(async () => {
          await copyToClipboard(selectedDevice.deviceId);
          return `Copied device ID: ${selectedDevice.deviceId}`;
        }),
      },
      {
        key: 'a',
        label: 'device actions',
        onAction: () => actions.runAction(async () => {
          openDeviceActions(selectedDevice.deviceId);
          return `Opening actions for ${selectedDevice.deviceId}`;
        }),
      },
    ];
  }, [actions, openDeviceActions, selectedDevice]);

  const blocked = activeField !== null || detail.isOpen || actionsDeviceId !== null;
  const orgDisplay = appliedOrgPath ?? '(all orgs)';

  useInput((input, key) => {
    if (actionsDeviceId !== null || detail.isOpen) return;

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
    }
  });

  if (actionsDeviceId !== null) {
    return (
      <DeviceActionsTui
        deviceDeps={deviceDeps as Required<WorkspaceDeviceCommandDeps>}
        prefillDeviceId={actionsDeviceId}
        onCancel={() => setActionsDeviceId(null)}
      />
    );
  }

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Device'}
        lines={detail.lines}
        loading={detail.loading}
        error={detail.error}
        onBack={clearDetail}
        actions={detailPanelActions}
        actionStatus={actions.actionStatus}
        actionBusy={actions.actionBusy}
      />
    );
  }

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
      onSelect={handleSelectDevice}
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