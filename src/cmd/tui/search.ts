import type { WorkspaceUser } from '../workspace/commands.js';

export function normalizeOrgUnitPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '/';
  const normalized = trimmed.replace(/\\/g, '/');
  if (normalized.match(/^[A-Z]:\//i)) {
    return '/' + normalized.split('/').pop();
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function filterWorkspaceUsersByQuery(
  users: WorkspaceUser[],
  query: string,
): WorkspaceUser[] {
  const q = query.trim().toLowerCase();
  if (!q) return users;

  return users.filter((user) => {
    const email = user.primaryEmail.toLowerCase();
    const given = user.name.givenName.toLowerCase();
    const family = user.name.familyName.toLowerCase();
    const fullName = `${given} ${family}`.trim();
    return email.includes(q) || given.includes(q) || family.includes(q) || fullName.includes(q);
  });
}

export function filterItemsByQuery<T>(
  items: T[],
  query: string,
  fields: (item: T) => string[],
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) =>
    fields(item).some((f) => f.toLowerCase().includes(q)),
  );
}