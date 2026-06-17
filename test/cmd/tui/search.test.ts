import { describe, it, expect } from 'vitest';
import {
  normalizeOrgUnitPath,
  filterWorkspaceUsersByQuery,
  filterItemsByQuery,
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