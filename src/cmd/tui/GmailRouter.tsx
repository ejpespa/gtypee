import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { ListMessagesTui } from '../gmail/ListMessagesTui.js';
import { ListDraftsTui } from '../gmail/ListDraftsTui.js';
import { ListThreadsTui } from '../gmail/ListThreadsTui.js';
import type { GmailAttachmentDeps, GmailCommandDeps, GmailDraftDeps, GmailThreadDeps } from '../gmail/commands.js';

interface GmailRouterProps {
  deps: Required<GmailCommandDeps>;
  attachmentDeps: Required<GmailAttachmentDeps>;
  draftDeps: Required<GmailDraftDeps>;
  threadDeps: Required<GmailThreadDeps>;
  onCancel: () => void;
}

export function GmailRouter({ deps, attachmentDeps, draftDeps, threadDeps, onCancel }: GmailRouterProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const items = [
    { label: 'Inbox Messages', value: 'inbox' },
    { label: 'Search Messages', value: 'search' },
    { label: 'Drafts', value: 'drafts' },
    { label: 'Threads', value: 'threads' },
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveSubMenu(item.value);
  };

  useInput((_input, key) => {
    if (activeSubMenu === null && key.escape) {
      onCancel();
    }
  });

  if (activeSubMenu === 'inbox') {
    return (
      <ListMessagesTui
        gmailDeps={deps}
        gmailAttachmentDeps={attachmentDeps}
        title="Inbox Messages"
        defaultQuery="in:inbox"
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'search') {
    return (
      <ListMessagesTui
        gmailDeps={deps}
        gmailAttachmentDeps={attachmentDeps}
        title="Search Messages"
        defaultQuery=""
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'drafts') {
    return (
      <ListDraftsTui
        draftDeps={draftDeps}
        title="Drafts"
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'threads') {
    return (
      <ListThreadsTui
        threadDeps={threadDeps}
        title="Threads"
        defaultQuery=""
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Gmail</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return to services</Text>
      </Box>
    </Box>
  );
}