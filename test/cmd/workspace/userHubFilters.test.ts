import { describe, it, expect, vi } from 'vitest';
import {
  emailsMatch,
  filterRowsByUserEmail,
  filterDevicesByUserEmail,
  collectDevicesForUser,
  DEVICE_SCAN_MAX_PAGES,
} from '../../../src/cmd/workspace/userHubFilters.js';
import type { Device } from '../../../src/cmd/workspace/commands.js';

const device = (overrides: Partial<Device> = {}): Device => ({
  deviceId: 'd1',
  email: 'jane@acme.com',
  modelName: 'Pixel',
  osVersion: '14',
  status: 'ACTIVE',
  orgUnitPath: '/',
  lastSync: '2026-01-01',
  ...overrides,
});

describe('emailsMatch', () => {
  it('matches case-insensitively and trims', () => {
    expect(emailsMatch('Jane@Acme.com', ' jane@acme.com ')).toBe(true);
    expect(emailsMatch('a@x.com', 'b@x.com')).toBe(false);
  });
});

describe('filterRowsByUserEmail', () => {
  it('keeps only matching userEmail rows', () => {
    const rows = [
      { userEmail: 'jane@acme.com', id: 1 },
      { userEmail: 'bob@acme.com', id: 2 },
      { userEmail: 'JANE@acme.com', id: 3 },
    ];
    expect(filterRowsByUserEmail(rows, 'jane@acme.com').map((r) => r.id)).toEqual([1, 3]);
  });
});

describe('filterDevicesByUserEmail', () => {
  it('filters on device.email', () => {
    const devices = [
      device({ deviceId: '1', email: 'jane@acme.com' }),
      device({ deviceId: '2', email: 'bob@acme.com' }),
    ];
    expect(filterDevicesByUserEmail(devices, 'jane@acme.com').map((d) => d.deviceId)).toEqual(['1']);
  });
});

describe('collectDevicesForUser', () => {
  it('merges chromebook and mobile matches and reports incomplete when page cap hit with more pages', async () => {
    const listDevices = vi.fn(async (input: { type?: string }, options?: { pageToken?: string }) => {
      if (input.type === 'chromebook') {
        if (!options?.pageToken) {
          return {
            items: [device({ deviceId: 'c1', email: 'jane@acme.com' })],
            nextPageToken: 'p2',
          };
        }
        return {
          items: [device({ deviceId: 'c2', email: 'other@acme.com' })],
          nextPageToken: 'p3',
        };
      }
      return { items: [device({ deviceId: 'm1', email: 'jane@acme.com' })] };
    });

    const result = await collectDevicesForUser(listDevices, 'jane@acme.com', {
      maxPagesPerType: 1,
      pageSize: 50,
    });

    expect(result.devices.map((d) => d.deviceId).sort()).toEqual(['c1', 'm1']);
    expect(result.devices.find((d) => d.deviceId === 'c1')?.deviceType).toBe('chromebook');
    expect(result.incomplete).toBe(true);
  });

  it('DEVICE_SCAN_MAX_PAGES is 5', () => {
    expect(DEVICE_SCAN_MAX_PAGES).toBe(5);
  });
});
