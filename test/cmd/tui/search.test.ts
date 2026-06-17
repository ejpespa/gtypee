import { describe, it, expect } from 'vitest';
import {
  normalizeOrgUnitPath,
  filterWorkspaceUsersByQuery,
  filterItemsByQuery,
  escapeAdminQueryValue,
  buildListUsersAdminQuery,
  buildListUsersSearchQueries,
} from '../../../src/cmd/tui/search.js';
import type { WorkspaceUser } from '../../../src/cmd/workspace/commands.js';

const sampleUser = (overrides: Partial<WorkspaceUser> = {}): WorkspaceUser => ({
  id: '1',
  primaryEmail: 'alice@example.com',
  name: { givenName: 'Alice', familyName: 'Smith' },
  suspended: false,
  orgUnitPath: '/Test',
  isAdmin: false,
  ...overrides,
});

describe('escapeAdminQueryValue', () => {
  it('escapes single quotes', () => {
    expect(escapeAdminQueryValue("Valentine's")).toBe("Valentine\\'s");
  });
});

describe('buildListUsersAdminQuery', () => {
  it('defaults to non-suspended users when no org or search', () => {
    expect(buildListUsersAdminQuery()).toBe('isSuspended=false');
  });

  it('scopes by org unit path', () => {
    expect(buildListUsersAdminQuery('/Faculty')).toBe("orgUnitPath='/Faculty'");
  });

  it('searches by full email', () => {
    expect(buildListUsersAdminQuery('/', 'alice@example.com')).toBe(
      "orgUnitPath='/' email:alice@example.com",
    );
  });

  it('searches by first or last name word', () => {
    expect(buildListUsersAdminQuery(undefined, 'Maria')).toBe("name:'Maria'");
    expect(buildListUsersAdminQuery('/HR', 'Santos')).toBe("orgUnitPath='/HR' name:'Santos'");
  });

  it('searches by full name phrase', () => {
    expect(buildListUsersAdminQuery('/HR', 'Jane Smith')).toBe(
      "orgUnitPath='/HR' name:'Jane Smith'",
    );
  });

  it('escapes quotes in org path and search', () => {
    expect(buildListUsersAdminQuery("/O'Brien", "Valentine's Day")).toBe(
      "orgUnitPath='/O\\'Brien' name:'Valentine\\'s Day'",
    );
  });
});

describe('buildListUsersSearchQueries', () => {
  it('returns one query for email or multi-word name', () => {
    expect(buildListUsersSearchQueries('/', 'a@b.com')).toEqual([
      "orgUnitPath='/' email:a@b.com",
    ]);
    expect(buildListUsersSearchQueries('/HR', 'Jane Smith')).toEqual([
      "orgUnitPath='/HR' name:'Jane Smith'",
    ]);
  });

  it('returns merged name and email queries for a single word', () => {
    expect(buildListUsersSearchQueries('/Faculty', 'Santos')).toEqual([
      "orgUnitPath='/Faculty' name:'Santos'",
      "orgUnitPath='/Faculty' givenName:Santos*",
      "orgUnitPath='/Faculty' familyName:Santos*",
      "orgUnitPath='/Faculty' email:Santos*",
    ]);
  });
});

describe('normalizeOrgUnitPath', () => {
  it('adds leading slash when missing', () => {
    expect(normalizeOrgUnitPath('Test')).toBe('/Test');
  });

  it('keeps an existing absolute path', () => {
    expect(normalizeOrgUnitPath('/Test')).toBe('/Test');
  });

  it('defaults empty input to root', () => {
    expect(normalizeOrgUnitPath('')).toBe('/');
  });
});

describe('filterWorkspaceUsersByQuery', () => {
  const users = [
    sampleUser(),
    sampleUser({
      id: '2',
      primaryEmail: 'bob@example.com',
      name: { givenName: 'Bob', familyName: 'Jones' },
    }),
  ];

  it('returns all users when query is empty', () => {
    expect(filterWorkspaceUsersByQuery(users, '')).toHaveLength(2);
  });

  it('filters by email substring', () => {
    expect(filterWorkspaceUsersByQuery(users, 'alice')).toEqual([users[0]]);
  });

  it('filters by name substring', () => {
    expect(filterWorkspaceUsersByQuery(users, 'jones')).toEqual([users[1]]);
  });
});

describe('filterItemsByQuery', () => {
  const items = [
    { email: 'alice@example.com', name: 'Alice' },
    { email: 'bob@example.com', name: 'Bob' },
  ];

  it('filters by any extracted field', () => {
    const result = filterItemsByQuery(items, 'bob', (i) => [i.email, i.name]);
    expect(result).toEqual([items[1]]);
  });

  it('returns all items when query empty', () => {
    expect(filterItemsByQuery(items, '', (i) => [i.email])).toHaveLength(2);
  });
});