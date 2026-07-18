# TUI User Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace bare user detail with a User Hub that drills into Groups, Devices, Login audit, and Admin audit scoped to the selected user.

**Architecture:** Pure filter/helpers first, then `listGroupsForUser` dep, then `filterUserEmail` on audit TUIs, then scoped Related list components, then `UserHubTui`, then wire List Users / Inactive Users. Hub keeps a local view stack (`hub | related | actions`); no global focused-user session.

**Tech Stack:** TypeScript, React, Ink, `ink-select-input`, vitest, existing TUI primitives (`TuiListScreen`, `TuiDetailPanel`, `usePaginatedList`, `useDetailView`, `useDetailActions`)

**Spec:** `docs/superpowers/specs/2026-07-18-tui-user-hub-design.md`

## Global Constraints

- v1 Related targets only: Groups, Devices, Login audit (30d), Admin audit (30d)
- No Gmail/Drive/Calendar from hub
- No group membership or device wipe/disable from Related
- Device scan cap: max 5 pages per type (chromebook, mobile)
- ESC from Related child returns to hub, never skips hub to the list
- Prefer pure helpers + unit tests (project has few Ink component tests)
- Match existing code style: `.js` import extensions, vitest, `Required<>` deps where other TUI screens use them

## File map

| File | Role |
|------|------|
| `src/cmd/workspace/userHubFilters.ts` | Pure email match + audit/device filters + device collector |
| `src/cmd/workspace/commands.ts` | Add `listGroupsForUser` to `WorkspaceGroupCommandDeps` + default stub |
| `src/cmd/workspace/runtime.ts` | Implement `listGroupsForUser` via Directory API `groups.list({ userKey })` |
| `src/cmd/workspace/LoginAuditTui.tsx` | Optional `filterUserEmail` prop |
| `src/cmd/workspace/AdminAuditTui.tsx` | Optional `filterUserEmail` prop |
| `src/cmd/workspace/UserGroupsTui.tsx` | Related: groups for one user |
| `src/cmd/workspace/UserDevicesTui.tsx` | Related: devices for one user |
| `src/cmd/workspace/UserHubTui.tsx` | Profile + Related SelectInput + child stack + action keys |
| `src/cmd/workspace/ListUsersTui.tsx` | Enter opens hub instead of bare detail |
| `src/cmd/workspace/InactiveUsersTui.tsx` | Same hub entry |
| `src/cmd/workspace/WorkspaceUserTui.tsx` | Pass group/device/report deps into list screens |
| `src/cmd/tui/WorkspaceRouter.tsx` | Pass group/device deps into `WorkspaceUserTui` (report already passed) |
| `test/cmd/workspace/userHubFilters.test.ts` | Unit tests for filters + collector |
| `test/cmd/workspace/commands.test.ts` | Optional registration smoke if CLI exposes list-by-user later — not required for TUI-only dep |
| `README.md` | Document User Hub under Interactive TUI |

---

### Task 1: Pure user-hub filter helpers

**Files:**
- Create: `src/cmd/workspace/userHubFilters.ts`
- Test: `test/cmd/workspace/userHubFilters.test.ts`

**Interfaces:**
- Consumes: `Device` from `./commands.js`, `PaginatedResult` / `PaginationOptions` from `../../types/pagination.js`
- Produces:
  - `emailsMatch(a: string, b: string): boolean`
  - `filterRowsByUserEmail<T extends { userEmail: string }>(items: T[], userEmail: string): T[]`
  - `filterDevicesByUserEmail(devices: Device[], userEmail: string): Device[]`
  - `DEVICE_SCAN_MAX_PAGES = 5`
  - `DeviceWithType = Device & { deviceType: 'chromebook' | 'mobile' }`
  - `collectDevicesForUser(listDevices, userEmail, options?): Promise<{ devices: DeviceWithType[]; incomplete: boolean }>`

- [ ] **Step 1: Write the failing tests**

Create `test/cmd/workspace/userHubFilters.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/cmd/workspace/userHubFilters.test.ts`

Expected: FAIL — module not found / cannot resolve `userHubFilters.js`

- [ ] **Step 3: Implement helpers**

Create `src/cmd/workspace/userHubFilters.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/cmd/workspace/userHubFilters.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/cmd/workspace/userHubFilters.ts test/cmd/workspace/userHubFilters.test.ts
git commit -m "feat(workspace): add user hub filter helpers"
```

---

### Task 2: `listGroupsForUser` dependency + runtime

**Files:**
- Modify: `src/cmd/workspace/commands.ts` (`WorkspaceGroupCommandDeps` + `defaultGroupDeps`)
- Modify: `src/cmd/workspace/runtime.ts` (`buildWorkspaceGroupCommandDeps`)
- Test: `test/cmd/workspace/userHubFilters.test.ts` (extend) OR add pure mapper test in same file

**Interfaces:**
- Consumes: existing `GroupInfo`, `PaginationOptions`, `PaginatedResult`
- Produces: `listGroupsForUser?: (userEmail: string, options?: PaginationOptions) => Promise<PaginatedResult<GroupInfo>>` on `WorkspaceGroupCommandDeps`

- [ ] **Step 1: Write a failing test for the default dep shape**

Add to `test/cmd/workspace/commands.test.ts` near group tests (or create `test/cmd/workspace/listGroupsForUser.test.ts`):

```ts
import { describe, it, expect } from 'vitest';
import type { WorkspaceGroupCommandDeps, GroupInfo } from '../../../src/cmd/workspace/commands.js';

describe('listGroupsForUser dep contract', () => {
  it('accepts userEmail and optional pagination and returns PaginatedResult', async () => {
    const groups: GroupInfo[] = [
      { id: '1', email: 'team@acme.com', name: 'Team' },
    ];
    const listGroupsForUser: NonNullable<WorkspaceGroupCommandDeps['listGroupsForUser']> = async (
      userEmail,
      options,
    ) => {
      expect(userEmail).toBe('jane@acme.com');
      expect(options?.pageSize).toBe(20);
      return { items: groups, nextPageToken: 'n1' };
    };

    const result = await listGroupsForUser('jane@acme.com', { pageSize: 20 });
    expect(result.items).toEqual(groups);
    expect(result.nextPageToken).toBe('n1');
  });
});
```

This test documents the contract; it will fail typecheck until the field exists.

- [ ] **Step 2: Run typecheck to see missing property**

Run: `npx tsc -p tsconfig.json --noEmit 2>&1 | head` is unreliable on Windows; prefer:

Run: `npx vitest run test/cmd/workspace/listGroupsForUser.test.ts` after adding the file — if types missing, the import of `listGroupsForUser` from deps type still works as optional. Better force compile of a file that uses the field as required:

In Step 3 add the type first, then implement runtime.

Actually TDD for types: implement type + default in Step 3 so the contract test passes; add a unit test that maps API-like payloads:

Add `mapDirectoryGroupsToGroupInfo` only if you extract mapping — **YAGNI**: skip mapper extract. Implement type + default + runtime; test default stub returns empty:

```ts
// test/cmd/workspace/listGroupsForUser.test.ts
import { describe, it, expect } from 'vitest';

// Import after defaultGroupDeps is not exported — test via required field on a hand-built Required deps in UserHub later.

// Prefer testing runtime with a thin pure function:
```

**Revised Step 1 — pure map of groups list response fields:**

Add to `userHubFilters.ts` (or keep mapping inline in runtime only). Spec allows runtime-only. For testability, add:

```ts
// in userHubFilters.ts
export function mapGroupListItems(
  groups: Array<{ id?: string | null; email?: string | null; name?: string | null }>,
): { id: string; email: string; name: string }[] {
  return groups.map((g) => ({
    id: g.id ?? '',
    email: g.email ?? '',
    name: g.name ?? '',
  }));
}
```

Test:

```ts
it('mapGroupListItems fills empty strings for nullish fields', () => {
  expect(mapGroupListItems([{ id: null, email: 'a@b.com', name: undefined }])).toEqual([
    { id: '', email: 'a@b.com', name: '' },
  ]);
});
```

- [ ] **Step 2: Run test — fail on missing export**

Run: `npx vitest run test/cmd/workspace/userHubFilters.test.ts`

Expected: FAIL on `mapGroupListItems`

- [ ] **Step 3: Add type, default, map helper, runtime**

1. In `commands.ts` add to `WorkspaceGroupCommandDeps`:

```ts
listGroupsForUser?: (
  userEmail: string,
  options?: PaginationOptions,
) => Promise<PaginatedResult<GroupInfo>>;
```

2. In `defaultGroupDeps`:

```ts
listGroupsForUser: async () => ({ items: [] }),
```

3. In `userHubFilters.ts` add `mapGroupListItems` as above.

4. In `runtime.ts` inside `buildWorkspaceGroupCommandDeps`, after `listGroups`:

```ts
listGroupsForUser: async (userEmail: string, options?: PaginationOptions) => {
  const auth = await runtime.getClient(scopes("workspace"));
  const admin = google.admin({ version: "directory_v1", auth });

  try {
    const params: Record<string, unknown> = {
      userKey: userEmail,
    };
    if (options?.pageSize !== undefined) {
      params.maxResults = options.pageSize;
    }
    if (options?.pageToken !== undefined) {
      params.pageToken = options.pageToken;
    }

    const response = await admin.groups.list(params);
    const groups = response.data.groups ?? [];
    const items = groups.map((g) => ({
      id: g.id ?? "",
      email: g.email ?? "",
      name: g.name ?? "",
    }));

    const result: { items: typeof items; nextPageToken?: string } = { items };
    if (response.data.nextPageToken) {
      result.nextPageToken = response.data.nextPageToken;
    }
    return result;
  } catch {
    return { items: [] };
  }
},
```

(Optional: use `mapGroupListItems` for the map.)

- [ ] **Step 4: Run tests**

Run: `npx vitest run test/cmd/workspace/userHubFilters.test.ts`

Expected: PASS

Run: `npm run typecheck`

Expected: PASS (all `Required<WorkspaceGroupCommandDeps>` call sites include new field via defaults / spreads)

- [ ] **Step 5: Commit**

```bash
git add src/cmd/workspace/commands.ts src/cmd/workspace/runtime.ts src/cmd/workspace/userHubFilters.ts test/cmd/workspace/userHubFilters.test.ts
git commit -m "feat(workspace): add listGroupsForUser for user hub"
```

---

### Task 3: Audit TUIs — `filterUserEmail`

**Files:**
- Modify: `src/cmd/workspace/LoginAuditTui.tsx`
- Modify: `src/cmd/workspace/AdminAuditTui.tsx`
- Test: extend `test/cmd/workspace/userHubFilters.test.ts` (filter already covered); smoke that composition order is correct in comments / thin helper if needed

**Interfaces:**
- Consumes: `filterRowsByUserEmail` from `userHubFilters.ts`
- Produces: `filterUserEmail?: string` on both audit component props

- [ ] **Step 1: Document expected composition with a unit test**

Already covered by `filterRowsByUserEmail`. Add one integration-style pure test for “filter then search fields”:

```ts
it('audit pipeline: email filter then text query on remaining rows', () => {
  const rows = [
    { userEmail: 'jane@acme.com', ip: '1.1.1.1' },
    { userEmail: 'bob@acme.com', ip: '2.2.2.2' },
    { userEmail: 'jane@acme.com', ip: '9.9.9.9' },
  ];
  const forUser = filterRowsByUserEmail(rows, 'jane@acme.com');
  const searched = forUser.filter((r) => r.ip.includes('9.9'));
  expect(searched).toEqual([{ userEmail: 'jane@acme.com', ip: '9.9.9.9' }]);
});
```

- [ ] **Step 2: Run test — pass (helpers exist)**

Run: `npx vitest run test/cmd/workspace/userHubFilters.test.ts`

- [ ] **Step 3: Update LoginAuditTui**

Props:

```ts
export interface LoginAuditTuiProps {
  reportDeps: Required<WorkspaceReportCommandDeps>;
  days?: number;
  filterUserEmail?: string;
  onCancel?: () => void;
}
```

Destructure `filterUserEmail`. Import `filterRowsByUserEmail`.

After loading `logins`, when building list for display:

```ts
const scopedLogins = filterUserEmail
  ? filterRowsByUserEmail(logins, filterUserEmail)
  : logins;

const filteredLogins = filterItemsByQuery(
  scopedLogins,
  appliedSearch,
  (login) => [login.userEmail, login.ipAddress],
);
```

Breadcrumbs:

```ts
useEffect(() => {
  setBreadcrumbs(
    filterUserEmail
      ? ['Workspace', 'Users', filterUserEmail, 'Login audit']
      : ['Workspace', 'Reports', 'Login Audit'],
  );
  // help lines: if filterUserEmail, note list is scoped to that user
  setHelpLines([
    ...(filterUserEmail ? [`Scoped to ${filterUserEmail}`] : []),
    '/ or s — search',
    'Enter — view login event',
    'c — copy email in detail',
    '←/→ or Space — paginate',
    'ESC — back',
  ]);
}, [setBreadcrumbs, setHelpLines, filterUserEmail]);
```

Empty state: when `!loading && !error && filteredLogins.length === 0`, ensure list screen shows meaningful empty (use existing empty UI; if footer/pageLabel can include count, set:

```ts
// Use emptyMessage prop (TuiListScreen supports emptyMessage):
emptyMessage={
  filterUserEmail
    ? `No login events for ${filterUserEmail} in the last ${days} days.`
    : 'No login events on this page.'
}
pageLabel={`Page ${currentIndex + 1}/${totalPages} · ${filteredLogins.length} total`}
```

- [ ] **Step 4: Update AdminAuditTui the same way**

Mirror LoginAuditTui with `filterUserEmail`, `filterRowsByUserEmail`, breadcrumbs `… › Admin audit`, empty: `No admin events for {email} in the last {days} days.`

- [ ] **Step 5: Typecheck + tests**

Run: `npm run typecheck`  
Run: `npx vitest run test/cmd/workspace/userHubFilters.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/cmd/workspace/LoginAuditTui.tsx src/cmd/workspace/AdminAuditTui.tsx test/cmd/workspace/userHubFilters.test.ts
git commit -m "feat(tui): filter login and admin audit by user email"
```

---

### Task 4: `UserGroupsTui`

**Files:**
- Create: `src/cmd/workspace/UserGroupsTui.tsx`

**Interfaces:**
- Consumes: `groupDeps.listGroupsForUser`, `adminGroupUrl`, `TuiListScreen`, `usePaginatedList`
- Produces: `UserGroupsTui({ groupDeps, userEmail, onCancel })`

- [ ] **Step 1: Implement component (no Ink test harness in repo — verify typecheck)**

Create `src/cmd/workspace/UserGroupsTui.tsx` by copying structure from `ListGroupsTui.tsx` and switching fetch to `listGroupsForUser`. Use the real `TuiListScreen` API:

```ts
// TuiListScreen props (from src/cmd/tui/TuiListScreen.tsx):
// title, pageLabel, items, loading, error, hasNextPage, currentIndex,
// onSelect, formatLabel, getId, emptyMessage?, onPagination, onRefresh?, blocked?
```

Core differences from `ListGroupsTui`:

```tsx
export interface UserGroupsTuiProps {
  groupDeps: Required<WorkspaceGroupCommandDeps>;
  userEmail: string;
  onCancel?: () => void;
}

// fetchPage:
return groupDeps.listGroupsForUser(userEmail, {
  pageSize: DEFAULT_TUI_PAGE_SIZE,
  ...(pageToken !== undefined ? { pageToken } : {}),
});

// breadcrumbs: ['Workspace', 'Users', userEmail, 'Groups']
// help: ESC — back to user hub; no group actions / members in v1

// emptyMessage when !loading && groups page empty:
`No groups for ${userEmail}.`

// list render (match ListGroupsTui):
return (
  <TuiListScreen
    title={`Groups · ${userEmail}`}
    pageLabel={`Page ${currentIndex + 1}`}
    items={groups}
    loading={loading}
    error={error}
    hasNextPage={hasNextPage}
    currentIndex={currentIndex}
    onSelect={handleSelectGroup}
    formatLabel={formatGroupLabel}
    getId={(group) => group.id || group.email}
    emptyMessage={`No groups for ${userEmail}.`}
    onPagination={(action) => {
      if (action === 'next' && hasNextPage) setCurrentIndex((i) => i + 1);
      if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
    }}
    onRefresh={refresh}
    blocked={detail.isOpen}
  />
);
```

Detail panel: name, email, id; actions `o` open Admin, `c` copy email only (no `a` group actions, no `m` members).

ESC when not in detail calls `onCancel` (return to hub).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/cmd/workspace/UserGroupsTui.tsx
git commit -m "feat(tui): add UserGroupsTui for user hub related groups"
```

---

### Task 5: `UserDevicesTui`

**Files:**
- Create: `src/cmd/workspace/UserDevicesTui.tsx`

**Interfaces:**
- Consumes: `collectDevicesForUser`, `deviceDeps.listDevices`
- Produces: `UserDevicesTui({ deviceDeps, userEmail, onCancel })`

- [ ] **Step 1: Implement using collectDevicesForUser**

Mirror `LoginAuditTui` (load once, then `sliceLocalPage`) because collection already walks remote pages. Use real `TuiListScreen` props.

```tsx
export interface UserDevicesTuiProps {
  deviceDeps: Required<WorkspaceDeviceCommandDeps>;
  userEmail: string;
  onCancel?: () => void;
}

function formatDeviceLabel(d: DeviceWithType): string {
  return `${d.deviceType} · ${d.modelName || 'Unknown'} · ${d.status || '?'} · ${d.lastSync || 'Never'}`;
}

// load():
const result = await collectDevicesForUser(deviceDeps.listDevices!, userEmail, {
  pageSize: DEFAULT_TUI_PAGE_SIZE,
});
setDevices(result.devices);
setIncomplete(result.incomplete);

// pagination:
const { slice: visibleDevices, hasNextPage } = sliceLocalPage(
  devices,
  currentIndex,
  DEFAULT_TUI_PAGE_SIZE,
);
const totalPages = Math.max(1, Math.ceil(devices.length / DEFAULT_TUI_PAGE_SIZE));

// pageLabel:
const pageLabel = incomplete
  ? `Page ${currentIndex + 1}/${totalPages} · ${devices.length} total · may be incomplete`
  : `Page ${currentIndex + 1}/${totalPages} · ${devices.length} total`;

// emptyMessage:
`No devices linked to ${userEmail}.`

// list:
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
    onRefresh={() => { void load(); }}
    blocked={detail.isOpen}
  />
);
```

Detail: deviceId, email, model, OS, status, org, lastSync, deviceType. **No** wipe/disable actions. ESC when not in detail → `onCancel`.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/cmd/workspace/UserDevicesTui.tsx
git commit -m "feat(tui): add UserDevicesTui for user hub related devices"
```

---

### Task 6: `UserHubTui`

**Files:**
- Create: `src/cmd/workspace/UserHubTui.tsx`

**Interfaces:**
- Consumes: Related children, `UserActionsTui`, profile fields from `WorkspaceUser`, action helpers
- Produces:

```ts
export interface UserHubTuiProps {
  user: WorkspaceUser;
  userDeps: Required<WorkspaceUserCommandDeps>;
  groupDeps: Required<WorkspaceGroupCommandDeps>;
  deviceDeps: Required<WorkspaceDeviceCommandDeps>;
  reportDeps: Required<WorkspaceReportCommandDeps>;
  breadcrumbRoot?: string[]; // default ['Workspace', 'Users']
  onCancel?: () => void;
}
```

- [ ] **Step 1: Implement hub view stack**

```tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { TuiKeybar } from '../tui/TuiKeybar.js';
import { TuiScreenShell } from '../tui/TuiScreenShell.js';
import { adminUserSecurityUrl, adminUserUrl } from '../tui/resourceLinks.js';
import { copyToClipboard, openInBrowser } from '../tui/systemActions.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { UserActionsTui } from './UserActionsTui.js';
import { UserGroupsTui } from './UserGroupsTui.js';
import { UserDevicesTui } from './UserDevicesTui.js';
import { LoginAuditTui } from './LoginAuditTui.js';
import { AdminAuditTui } from './AdminAuditTui.js';
import type {
  WorkspaceUser,
  WorkspaceUserCommandDeps,
  WorkspaceGroupCommandDeps,
  WorkspaceDeviceCommandDeps,
  WorkspaceReportCommandDeps,
} from './commands.js';

type HubView =
  | { kind: 'hub' }
  | { kind: 'related'; target: 'groups' | 'devices' | 'login-audit' | 'admin-audit' }
  | { kind: 'actions' };

// props as above

const RELATED_ITEMS = [
  { label: 'Groups', value: 'groups' },
  { label: 'Devices', value: 'devices' },
  { label: 'Login audit (30d)', value: 'login-audit' },
  { label: 'Admin audit (30d)', value: 'admin-audit' },
] as const;

export function UserHubTui({
  user,
  userDeps,
  groupDeps,
  deviceDeps,
  reportDeps,
  breadcrumbRoot = ['Workspace', 'Users'],
  onCancel,
}: UserHubTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();
  const [view, setView] = useState<HubView>({ kind: 'hub' });
  const [aliases, setAliases] = useState<string[] | null>(null);
  const actions = useDetailActions();

  useEffect(() => {
    let active = true;
    if (userDeps.listAliases) {
      userDeps.listAliases(user.primaryEmail)
        .then((list) => { if (active) setAliases(list); })
        .catch(() => { if (active) setAliases([]); });
    } else {
      setAliases([]);
    }
    return () => { active = false; };
  }, [user.primaryEmail, userDeps]);

  useEffect(() => {
    if (view.kind !== 'hub') return;
    setBreadcrumbs([...breadcrumbRoot, user.primaryEmail]);
    setHelpLines([
      'Enter — open related view for this user',
      'a — user actions (password, suspend, …)',
      'o — open in Admin Console · c — copy email · l — login challenge',
      'ESC — back to user list',
      'Related: groups, devices, login audit, admin audit (30 days)',
    ]);
  }, [breadcrumbRoot, setBreadcrumbs, setHelpLines, user.primaryEmail, view.kind]);

  const profileLines = useMemo(() => {
    const fullName = [user.name.givenName, user.name.familyName].filter(Boolean).join(' ') || '(none)';
    let aliasLine = 'Loading aliases…';
    if (aliases !== null) {
      aliasLine = aliases.length > 0
        ? (aliases.length > 8 ? `${aliases.slice(0, 8).join(', ')} +${aliases.length - 8} more` : aliases.join(', '))
        : '(none)';
    }
    return [
      `Email: ${user.primaryEmail}`,
      `Name: ${fullName}`,
      `Org unit: ${user.orgUnitPath}`,
      `Admin: ${user.isAdmin ? 'yes' : 'no'}`,
      `Suspended: ${user.suspended ? 'yes' : 'no'}`,
      `Last login: ${user.lastLoginTime ?? 'unknown'}`,
      `User ID: ${user.id}`,
      `Aliases: ${aliasLine}`,
    ];
  }, [aliases, user]);

  useInput((input, key) => {
    if (view.kind !== 'hub' || actions.actionBusy) return;
    if (key.escape) {
      onCancel?.();
      return;
    }
    if (input === 'a') {
      setView({ kind: 'actions' });
      return;
    }
    if (input === 'c') {
      void actions.runAction(async () => {
        await copyToClipboard(user.primaryEmail);
        return `Copied email: ${user.primaryEmail}`;
      });
      return;
    }
    if (input === 'o') {
      void actions.runAction(async () => {
        const userKey = user.id || user.primaryEmail;
        await openInBrowser(adminUserUrl(userKey));
        return 'Opened in Admin Console';
      });
      return;
    }
    if (input === 'l') {
      void actions.runAction(async () => {
        const userKey = user.id || user.primaryEmail;
        await openInBrowser(adminUserSecurityUrl(userKey));
        return `Opened Security for ${user.primaryEmail}. Click Login challenge → Turn Off For 10 Minutes.`;
      });
    }
  });

  const backToHub = useCallback(() => setView({ kind: 'hub' }), []);

  if (view.kind === 'actions') {
    return (
      <UserActionsTui
        userDeps={userDeps}
        prefillEmail={user.primaryEmail}
        onCancel={backToHub}
      />
    );
  }

  if (view.kind === 'related') {
    if (view.target === 'groups') {
      return <UserGroupsTui groupDeps={groupDeps} userEmail={user.primaryEmail} onCancel={backToHub} />;
    }
    if (view.target === 'devices') {
      return <UserDevicesTui deviceDeps={deviceDeps} userEmail={user.primaryEmail} onCancel={backToHub} />;
    }
    if (view.target === 'login-audit') {
      return (
        <LoginAuditTui
          reportDeps={reportDeps}
          days={30}
          filterUserEmail={user.primaryEmail}
          onCancel={backToHub}
        />
      );
    }
    return (
      <AdminAuditTui
        reportDeps={reportDeps}
        days={30}
        filterUserEmail={user.primaryEmail}
        onCancel={backToHub}
      />
    );
  }

  // hub home
  return (
    <TuiScreenShell title={`User · ${user.primaryEmail}`}>
      <Box flexDirection="column" marginBottom={1}>
        {profileLines.map((line) => (
          <Text key={line}>{line}</Text>
        ))}
      </Box>
      <Box marginBottom={1}>
        <Text bold color="cyan">Related</Text>
      </Box>
      <SelectInput
        items={RELATED_ITEMS.map((i) => ({ label: i.label, value: i.value }))}
        onSelect={(item) => {
          setView({
            kind: 'related',
            target: item.value as 'groups' | 'devices' | 'login-audit' | 'admin-audit',
          });
        }}
      />
      {actions.actionStatus ? (
        <Box marginTop={1}><Text color="green">{actions.actionStatus}</Text></Box>
      ) : null}
      <TuiKeybar detailEnabled={false} refreshEnabled={false} />
      <Text color="gray">a actions · o Admin · c copy · l challenge · ESC back</Text>
    </TuiScreenShell>
  );
}
```

Align `TuiKeybar` props with other screens (`buildKeybarLine` usage if required). Do not open hub when `!user.primaryEmail` — callers must guard.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/cmd/workspace/UserHubTui.tsx
git commit -m "feat(tui): add UserHubTui with related navigation"
```

---

### Task 7: Wire List Users, Inactive Users, routers

**Files:**
- Modify: `src/cmd/workspace/ListUsersTui.tsx`
- Modify: `src/cmd/workspace/InactiveUsersTui.tsx`
- Modify: `src/cmd/workspace/WorkspaceUserTui.tsx`
- Modify: `src/cmd/tui/WorkspaceRouter.tsx` (only if `WorkspaceUserTui` needs more deps)

**Interfaces:**
- List screens accept `groupDeps`, `deviceDeps`, `reportDeps` and open `UserHubTui` on select
- `WorkspaceUserTui` receives full deps and passes them down

- [ ] **Step 1: Expand WorkspaceUserTui props**

```ts
export interface WorkspaceUserTuiProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  reportDeps: Required<WorkspaceReportCommandDeps>;
  groupDeps: Required<WorkspaceGroupCommandDeps>;
  deviceDeps: Required<WorkspaceDeviceCommandDeps>;
  onCancel?: () => void;
}
```

Pass all four into `ListUsersTui` and `InactiveUsersTui`.

Update `WorkspaceRouter` users branch:

```tsx
<WorkspaceUserTui
  userDeps={deps.userDeps}
  reportDeps={deps.reportDeps}
  groupDeps={deps.groupDeps}
  deviceDeps={deps.deviceDeps}
  onCancel={() => setActiveSubMenu(null)}
/>
```

- [ ] **Step 2: ListUsersTui — open hub instead of detail panel**

Props:

```ts
export interface ListUsersTuiProps {
  userDeps: WorkspaceUserCommandDeps;
  groupDeps: Required<WorkspaceGroupCommandDeps>;
  deviceDeps: Required<WorkspaceDeviceCommandDeps>;
  reportDeps: Required<WorkspaceReportCommandDeps>;
  defaultOrgUnitPath?: string;
  onCancel?: () => void;
}
```

State: keep `selectedUser`; remove detail-open path for profile (or keep detail state unused).

`handleSelectUser`:

```ts
const handleSelectUser = useCallback(async (userId: string) => {
  const user = rawUsers.find((u) => u.id === userId);
  if (!user?.primaryEmail) return;
  setSelectedUser(user);
}, [rawUsers]);
```

Render:

```tsx
if (selectedUser) {
  return (
    <UserHubTui
      user={selectedUser}
      userDeps={userDeps as Required<WorkspaceUserCommandDeps>}
      groupDeps={groupDeps}
      deviceDeps={deviceDeps}
      reportDeps={reportDeps}
      breadcrumbRoot={['Workspace', 'Users']}
      onCancel={() => setSelectedUser(null)}
    />
  );
}
```

Remove `actionsEmail` dual path **or** keep it only if still needed — hub owns `a` → UserActions. Remove list-level `UserActionsTui` branch if hub covers it.

Remove old `TuiDetailPanel` profile branch and unused `detail`/`detailPanelActions` if dead.

Update help line: `Enter — open user hub`.

- [ ] **Step 3: InactiveUsersTui — same hub wiring**

Same props additions and hub render with `breadcrumbRoot={['Workspace', 'Users', 'Inactive']}`.

- [ ] **Step 4: Typecheck + full unit tests**

Run: `npm run typecheck`  
Run: `npx vitest run test/cmd/workspace test/cmd/tui`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cmd/workspace/ListUsersTui.tsx src/cmd/workspace/InactiveUsersTui.tsx src/cmd/workspace/WorkspaceUserTui.tsx src/cmd/tui/WorkspaceRouter.tsx
git commit -m "feat(tui): open User Hub from list and inactive users"
```

---

### Task 8: README + manual sanity checklist

**Files:**
- Modify: `README.md` (Interactive TUI / Workspace Admin section)

- [ ] **Step 1: Document User Hub**

Under Workspace Admin / keyboard section, add:

```markdown
**User Hub:** From List Users or Inactive Users, Enter opens a User Hub for that account. Related links open Groups, Devices, Login audit (30d), and Admin audit (30d) scoped to the user. ESC returns to the hub, then to the list. Keys: **a** actions · **o** Admin · **c** copy email · **l** login challenge.
```

- [ ] **Step 2: Manual checklist (run locally with SA)**

1. `gtypee --sa … --impersonate … tui` → Workspace → User Management → List Users  
2. Enter user → see profile + Related  
3. Groups / Devices / Login audit / Admin audit each scoped; ESC to hub  
4. `a` actions still works; `c` copies; ESC to list  

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document User Hub related navigation in TUI"
```

---

## Self-review vs spec

| Spec requirement | Task |
|------------------|------|
| User Hub with Related | Task 6 |
| Groups via listGroupsForUser | Tasks 2, 4 |
| Devices with filter + page cap | Tasks 1, 5 |
| Login/Admin audit filter 30d | Tasks 3, 6 |
| ESC stack hub-local | Tasks 6–7 |
| a/o/c/l preserved | Task 6 |
| List + Inactive entry | Task 7 |
| Non-goals (no Gmail, no writes) | Not implemented — intentional |
| Tests for filters + groups map | Tasks 1–2 |
| README | Task 8 |

**Placeholder scan:** No TBD steps; implementers must still match exact `TuiListScreen` props from existing list files (noted in Tasks 4–5).

**Type consistency:** `listGroupsForUser(userEmail, options?)`, `filterUserEmail?: string`, `HubView` kinds match across tasks.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-18-tui-user-hub.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with executing-plans checkpoints  

Which approach?
