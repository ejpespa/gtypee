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
