import type { WorkspaceUser } from '../workspace/commands.js';

/** Escape single quotes for Google Admin Directory API query strings. */
export function escapeAdminQueryValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

/**
 * Build a Google Admin Directory API `users.list` query from org unit + free-text search.
 * @see https://developers.google.com/workspace/admin/directory/v1/guides/search-users
 */
export function buildListUsersAdminQuery(orgUnitPath?: string, search?: string): string {
  const parts: string[] = [];
  const term = search?.trim();

  if (orgUnitPath) {
    parts.push(`orgUnitPath='${escapeAdminQueryValue(orgUnitPath)}'`);
  } else if (!term) {
    parts.push('isSuspended=false');
  }

  if (term) {
    if (term.includes('@')) {
      parts.push(`email:${escapeAdminQueryValue(term)}`);
    } else if (term.includes(' ')) {
      parts.push(`name:'${escapeAdminQueryValue(term)}'`);
    } else {
      // givenName/familyName word match (first or last name).
      parts.push(`name:'${escapeAdminQueryValue(term)}'`);
    }
  }

  return parts.join(' ');
}

/**
 * Admin API cannot OR email vs givenName vs familyName in one query.
 * For a single-word search, run separate queries and merge in listUsers.
 */
export function buildListUsersSearchQueries(orgUnitPath?: string, search?: string): string[] {
  const term = search?.trim();
  if (!term) {
    return [buildListUsersAdminQuery(orgUnitPath)];
  }
  if (term.includes('@') || term.includes(' ')) {
    return [buildListUsersAdminQuery(orgUnitPath, term)];
  }

  const orgPart = orgUnitPath
    ? `orgUnitPath='${escapeAdminQueryValue(orgUnitPath)}'`
    : '';
  const withClause = (clause: string) => (orgPart ? `${orgPart} ${clause}` : clause);
  const escaped = escapeAdminQueryValue(term);

  return [
    withClause(`name:'${escaped}'`),
    withClause(`givenName:${escaped}*`),
    withClause(`familyName:${escaped}*`),
    withClause(`email:${escaped}*`),
  ];
}

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