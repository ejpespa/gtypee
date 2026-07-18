import type { Device, WorkspaceDeviceCommandDeps } from './commands.js';
import type { PaginationOptions } from '../../types/pagination.js';

export const DEVICE_SCAN_MAX_PAGES = 5;

export type DeviceWithType = Device & { deviceType: 'chromebook' | 'mobile' };

export function emailsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function filterRowsByUserEmail<T extends { userEmail: string }>(
  items: T[],
  userEmail: string,
): T[] {
  return items.filter((item) => emailsMatch(item.userEmail, userEmail));
}

export function filterDevicesByUserEmail(devices: Device[], userEmail: string): Device[] {
  return devices.filter((d) => emailsMatch(d.email, userEmail));
}

export async function collectDevicesForUser(
  listDevices: NonNullable<WorkspaceDeviceCommandDeps['listDevices']>,
  userEmail: string,
  options?: { maxPagesPerType?: number; pageSize?: number },
): Promise<{ devices: DeviceWithType[]; incomplete: boolean }> {
  const maxPages = options?.maxPagesPerType ?? DEVICE_SCAN_MAX_PAGES;
  const pageSize = options?.pageSize ?? 50;
  const devices: DeviceWithType[] = [];
  let incomplete = false;

  for (const deviceType of ['chromebook', 'mobile'] as const) {
    let pageToken: string | undefined;
    for (let page = 0; page < maxPages; page++) {
      const pagination: PaginationOptions = {
        pageSize,
        ...(pageToken !== undefined ? { pageToken } : {}),
      };
      const result = await listDevices({ type: deviceType }, pagination);
      for (const item of result.items) {
        if (emailsMatch(item.email, userEmail)) {
          devices.push({ ...item, deviceType });
        }
      }
      if (!result.nextPageToken) {
        pageToken = undefined;
        break;
      }
      pageToken = result.nextPageToken;
      if (page === maxPages - 1) {
        incomplete = true;
      }
    }
  }

  return { devices, incomplete };
}
