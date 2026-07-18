import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useInput } from 'ink';
import {
  DEFAULT_TUI_PAGE_SIZE,
  sliceLocalPage,
} from '../tui/pagination.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { copyToClipboard } from '../tui/systemActions.js';
import { translateApiError } from '../tui/translateApiError.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import type { WorkspaceDeviceCommandDeps } from './commands.js';
import {
  collectDevicesForUser,
  type DeviceWithType,
} from './userHubFilters.js';

export interface UserDevicesTuiProps {
  deviceDeps: Required<WorkspaceDeviceCommandDeps>;
  userEmail: string;
  onCancel?: () => void;
}

function formatDeviceLabel(d: DeviceWithType): string {
  return `${d.deviceType} · ${d.modelName || 'Unknown'} · ${d.status || '?'} · ${d.lastSync || 'Never'}`;
}

export function UserDevicesTui({ deviceDeps, userEmail, onCancel }: UserDevicesTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [devices, setDevices] = useState<DeviceWithType[]>([]);
  const [incomplete, setIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithType | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Workspace', 'Users', userEmail, 'Devices']);
    setHelpLines([
      'r — refresh list',
      'Enter — view device',
      'c — copy device ID in detail',
      '←/→ or Space — paginate',
      'ESC — back to user hub',
    ]);
  }, [setBreadcrumbs, setHelpLines, userEmail]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCurrentIndex(0);

    collectDevicesForUser(deviceDeps.listDevices, userEmail, {
      pageSize: DEFAULT_TUI_PAGE_SIZE,
    })
      .then((result) => {
        if (!active) return;
        setDevices(result.devices);
        setIncomplete(result.incomplete);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(translateApiError(err));
        setDevices([]);
        setIncomplete(false);
        setLoading(false);
      });

    return () => { active = false; };
  }, [deviceDeps, userEmail, reloadToken]);

  const load = useCallback(() => {
    setReloadToken((t) => t + 1);
  }, []);

  const { slice: visibleDevices, hasNextPage } = sliceLocalPage(
    devices,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );
  const totalPages = Math.max(1, Math.ceil(devices.length / DEFAULT_TUI_PAGE_SIZE));

  const pageLabel = incomplete
    ? `Page ${currentIndex + 1}/${totalPages} · ${devices.length} total · may be incomplete`
    : `Page ${currentIndex + 1}/${totalPages} · ${devices.length} total`;

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setSelectedDevice(null);
  }, [actions, detail]);

  const handleSelectDevice = useCallback(async (deviceId: string) => {
    const device = devices.find((d) => d.deviceId === deviceId);
    if (!device) return;

    actions.resetStatus();
    setSelectedDevice(device);

    await detail.open({
      title: device.modelName || device.deviceId,
      load: async () => [
        `Device ID: ${device.deviceId}`,
        `Email: ${device.email || '(none)'}`,
        `Model: ${device.modelName || '(unknown)'}`,
        `OS: ${device.osVersion || '(unknown)'}`,
        `Status: ${device.status || '(unknown)'}`,
        `Org: ${device.orgUnitPath || '(none)'}`,
        `Last sync: ${device.lastSync || 'Never'}`,
        `Type: ${device.deviceType}`,
      ],
    });
  }, [actions, detail, devices]);

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
    ];
  }, [actions, selectedDevice]);

  useInput((_input, key) => {
    if (detail.isOpen) return;

    if (key.escape) {
      onCancel?.();
    }
  });

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

  return (
    <TuiListScreen
      title={`Devices · ${userEmail}`}
      pageLabel={pageLabel}
      items={visibleDevices}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectDevice}
      formatLabel={formatDeviceLabel}
      getId={(d) => d.deviceId}
      emptyMessage={`No devices linked to ${userEmail}.`}
      onPagination={(action) => {
        if (action === 'next' && hasNextPage) setCurrentIndex((i) => i + 1);
        if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
      }}
      onRefresh={load}
      blocked={detail.isOpen}
    />
  );
}
