# TUI User Hub — Design Spec

**Date:** 2026-07-18  
**Status:** Approved  
**Approach:** Option 2 — dedicated User Hub screen with Related drill-down (admin graph only)

## Problem Statement

gtypee’s Workspace Admin TUI already supports list → user detail → User Actions (password, suspend, Admin Console links). Real admin work is **user-centric**: after selecting a person, operators need their **groups, devices, login audit, and admin audit** without climbing the sidebar and re-finding that person.

Today those surfaces live under separate menus (Group Management, Device Management, Reports). Navigation does not match the mental model “this user → related admin data.”

## Goals

- From List Users (and Inactive Users), **Enter** opens a **User Hub** focused on one user.
- Hub shows **profile** plus a **Related** select list: Groups, Devices, Login audit (30d), Admin audit (30d).
- Each Related item opens a **pre-filtered / scoped** view for that user only.
- **ESC** from a Related child returns to the hub; ESC from hub returns to the user list.
- Preserve existing hub actions: User Actions (`a`), open Admin (`o`), copy email (`c`), login challenge (`l`).
- Keep v1 inside **Workspace Admin** (no Gmail/Drive impersonation flows).

## Non-Goals (v1)

- Gmail, Drive, Calendar, Chat, or other productivity services for the focused user.
- Global “focused user” session that persists across the Master Dashboard sidebar.
- Group membership mutations or device wipe/disable from Related lists.
- Custom audit day-range picker on the hub (fixed 30 days).
- Deleted-user recovery from the hub (remains under Reports → Deleted Users).
- Letter shortcuts for Related items (discover via SelectInput only).

## Architecture

### Navigation model

```
List Users / Inactive Users
  └─ Enter → UserHubTui (focused user)
                ├─ profile summary (read-only)
                ├─ SelectInput: Related
                │     ├─ Groups → UserGroupsTui ── ESC → hub
                │     ├─ Devices → UserDevicesTui ── ESC → hub
                │     ├─ Login audit (30d) → LoginAuditTui(filterUserEmail) ── ESC → hub
                │     └─ Admin audit (30d) → AdminAuditTui(filterUserEmail) ── ESC → hub
                ├─ a → UserActionsTui(prefillEmail) ── ESC → hub
                ├─ o / c / l → existing browser / clipboard / Security actions
                └─ ESC → user list
```

### Component boundaries

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `UserHubTui` | Profile, Related menu, action keys, child stack | `user`, `userDeps`, `groupDeps`, `deviceDeps`, `reportDeps` |
| `UserGroupsTui` | Groups for this user only | `groupDeps.listGroupsForUser` |
| `UserDevicesTui` | ChromeOS + mobile devices for this user | `deviceDeps.listDevices` + client filter |
| `LoginAuditTui` / `AdminAuditTui` | Existing screens + optional `filterUserEmail` | `reportDeps` |
| `ListUsersTui` / `InactiveUsersTui` | On Enter, open hub instead of bare `TuiDetailPanel` | Pass user + deps from router |
| `WorkspaceRouter` | Wire group/device/report deps into user list paths | Existing dep bags |

### Hub-local state

```ts
type HubView =
  | { kind: 'hub' }
  | { kind: 'related'; target: 'groups' | 'devices' | 'login-audit' | 'admin-audit' }
  | { kind: 'actions' };
```

Focus lives only while the hub is mounted. No global focused-user context.

### Stack rules

```
ListUsers | InactiveUsers
  └─ UserHub (view = hub)
       ├─ view = related:*
       │    └─ optional item detail inside that list TUI
       └─ view = actions (UserActionsTui)
```

- Related views **replace** the hub body (full-screen child).
- ESC from item detail → Related list → hub → user list (never skip the hub when leaving a Related child).
- Changing user only by leaving the hub and selecting another list row.

## Related views and data strategy

### 1. Groups — server-side by user

| Piece | Decision |
|-------|----------|
| New dep | `groupDeps.listGroupsForUser(userEmail, options?) → PaginatedResult<GroupInfo>` |
| Runtime | Directory API `groups.list` with `userKey` = primary email |
| UI | `TuiListScreen`: name/email; Enter → read-only group detail; optional `o` Admin group URL |
| Empty | `No groups for {email}.` |
| Writes | Out of scope; use Group Management |

### 2. Devices — list + filter by user email

| Piece | Decision |
|-------|----------|
| Approach | Fetch ChromeOS and mobile via existing `listDevices`; **client-filter** `email` case-insensitive match to hub user |
| UI | Combined list: `type · model · status · lastSync`; Enter → device detail |
| Empty | `No devices linked to {email}.` (note: ChromeOS uses annotated user; field can be empty/wrong) |
| Cap | Max **5 pages** per device type; if more pages remain, status: filtered count + “may be incomplete” |
| Writes | Wipe/disable out of scope for v1 |

### 3. Login audit and Admin audit — filter existing screens

| Piece | Decision |
|-------|----------|
| Props | `filterUserEmail?: string` on `LoginAuditTui` and `AdminAuditTui` |
| Load | Existing `getLoginAudit(days)` / `getAdminAudit(days)` |
| Filter | Keep rows where `userEmail` matches filter (case-insensitive) |
| Days from hub | Fixed **30** |
| Empty | `No login events for {email} in the last {days} days.` (same pattern for admin) |
| Search | Still refines within the filtered set |

No new Reports APIs.

### Deps wiring

```ts
// UserHubTui props (conceptual)
{
  user: WorkspaceUser;
  userDeps: Required<WorkspaceUserCommandDeps>;
  groupDeps: Required<WorkspaceGroupCommandDeps>; // includes listGroupsForUser
  deviceDeps: Required<WorkspaceDeviceCommandDeps>;
  reportDeps: Required<WorkspaceReportCommandDeps>;
  onCancel?: () => void;
}
```

`WorkspaceRouter` passes group/device/report deps into `ListUsersTui` and `InactiveUsersTui` the same way other nested deps are wired today.

## Hub interactions and keybinds

### Layout (hub home, top → bottom)

1. Title: `User · {primaryEmail}`
2. Profile block: name, org unit, admin, suspended, last login, user ID, aliases
3. Related `SelectInput`: Groups · Devices · Login audit (30d) · Admin audit (30d)
4. Keybar + optional action status

Profile is display-only. Arrow keys move only the Related list so focus stays simple.

### Keybinds — hub home

| Key | Action |
|-----|--------|
| ↑ / ↓ | Move Related selection |
| Enter | Open selected Related view |
| a | User Actions with `prefillEmail` |
| o | Open user in Admin Console |
| c | Copy primary email |
| l | Login challenge (Security page) |
| ? | Context help |
| ESC | Back to user list |

### Keybinds — Related child

| Key | Action |
|-----|--------|
| ESC | Pop to hub home |
| Existing list keys | Search, pagination, detail as each screen already supports |
| q | Do not quit the app from Related children |

### Loading and busy

| State | Behavior |
|-------|----------|
| Hub open | Profile from list payload immediately; aliases async if needed |
| Related open | Child owns loading UI |
| o / c / l / a | Status line via existing action helpers; ignore repeat keys while busy |

### Errors

1. Related failures stay in the child; ESC always recovers to the hub.
2. API errors use `translateApiError`.
3. Suspended/admin flags are informational; Related remains available.
4. Missing `primaryEmail`: do not open the hub.
5. Missing Workspace admin credentials: show  
   `This view needs Workspace admin credentials (service account + impersonate).`  
   on that Related view; hub keys that still work (`c`, possibly `o`) remain available.

### Breadcrumbs and help

- Hub: `Workspace › Users › {email}` (or Inactive Users equivalent).
- Related: append Groups / Devices / Login audit / Admin audit.
- Help lines cover Related navigation, action keys, and ESC behavior.

### Edge cases

| Case | Behavior |
|------|----------|
| Inactive Users entry | Same `UserHubTui`; breadcrumbs reflect Inactive Users |
| User deleted while hub open | Related may error/empty; ESC to list |
| Long alias list | Collapse with `+N more` if needed so Related stays visible |
| Short terminal | Prefer Related visibility over dumping all aliases |

## Testing

| Layer | Coverage |
|-------|----------|
| Unit — runtime | `listGroupsForUser` mapping, pagination, empty, errors |
| Unit — filters | Case-insensitive email match for devices and audit rows |
| Component — hub | Open with user; Enter Related; ESC stack order |
| Component — audit | `filterUserEmail` keeps only matching rows; empty copy |
| Integration (optional) | List → hub → login audit → ESC → hub → ESC → list with mock deps |

Use vitest + existing Ink test patterns. Mock deps; no live Google APIs in CI.

### Success criteria

1. Enter a user → hub with profile + Related.
2. Each Related view is scoped to that user.
3. ESC stack: Related (and nested detail) → hub → list.
4. `a` / `o` / `c` / `l` still work from the hub.
5. Clear empty and error states; hub never dead-ends.

## Rollout order

1. Add `listGroupsForUser` to group deps + runtime; unit tests.
2. Add `filterUserEmail` to Login and Admin audit TUIs.
3. Implement `UserHubTui`; switch List Users Enter path from bare detail to hub.
4. Implement `UserGroupsTui` and `UserDevicesTui` (empty/error/partial-scan).
5. Wire the same hub from Inactive Users.
6. Breadcrumbs, help lines, README TUI section, CHANGELOG.

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Sparse ChromeOS `annotatedUser` | Explicit empty copy; partial-scan banner |
| Large domains / audit payload | Keep 30d; reuse existing Reports loaders |
| Scope/SA missing | Per-Related error; hub remains usable |
| Scope creep | Non-goals locked until a later milestone |

## Relationship to prior specs

- Extends [2026-06-17 Workspace User Management](./2026-06-17-workspace-user-management-design.md): Enter no longer stops at read-only detail alone; detail becomes a **User Hub** with Related navigation. User Actions remain the home for destructive/sensitive mutations.
- Does not change Master Dashboard service sidebar structure.

## Open implementation notes

- Prefer reusing `TuiListScreen`, `usePaginatedList` / local pagination, `useDetailView`, and `UserActionsTui` rather than new frameworks.
- `listGroupsForUser` is the only required new Directory API capability for v1; device and audit scoping reuse existing deps with filtering.
- Device page cap (5 per type) is a deliberate v1 performance bound; tune later if needed.
)