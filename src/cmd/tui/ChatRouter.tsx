import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { ListMessagesTui } from '../chat/ListMessagesTui.js';
import { resolveChatSendTarget, type ChatCommandDeps } from '../chat/commands.js';
import { TuiWizard } from './TuiWizard.js';
import { translateApiError } from './translateApiError.js';

interface ChatRouterProps {
  deps: Required<ChatCommandDeps>;
  onCancel: () => void;
}

export function ChatRouter({ deps, onCancel }: ChatRouterProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const items = [
    { label: 'Space Messages', value: 'messages' },
    { label: 'Send to Email', value: 'send-email' },
    { label: 'Send to Space', value: 'send-space' },
  ];

  const sendMessage = async (target: { to?: string; space?: string }, text: string) => {
    await deps.ensureWorkspace();
    const targetSpace = await resolveChatSendTarget(deps, target);
    const result = await deps.sendMessage(targetSpace, text);
    if (!result.sent) {
      throw new Error('Message send was not applied');
    }
    const via = target.to ? `to ${target.to}` : `to space ${target.space}`;
    return `Sent ${via} (id=${result.id || 'unknown'})`;
  };

  const handleSelect = (item: { value: string }) => {
    setActiveSubMenu(item.value);
  };

  useInput((_input, key) => {
    if (activeSubMenu === null && key.escape) {
      onCancel();
    }
  });

  if (activeSubMenu === 'messages') {
    return (
      <ListMessagesTui
        chatDeps={deps}
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'send-email') {
    return (
      <TuiWizard
        title="Send Chat to Email"
        fields={[
          { key: 'to', label: 'Recipient email', required: true, placeholder: 'user@example.com' },
          { key: 'text', label: 'Message', required: true, multiline: true },
        ]}
        onCancel={() => setActiveSubMenu(null)}
        onSubmit={async (values) => {
          try {
            return await sendMessage({ to: values.to ?? '' }, values.text ?? '');
          } catch (error: unknown) {
            throw new Error(translateApiError(error));
          }
        }}
      />
    );
  }

  if (activeSubMenu === 'send-space') {
    return (
      <TuiWizard
        title="Send Chat to Space"
        fields={[
          { key: 'space', label: 'Space id', required: true, placeholder: 'spaces/ABC123' },
          { key: 'text', label: 'Message', required: true, multiline: true },
        ]}
        onCancel={() => setActiveSubMenu(null)}
        onSubmit={async (values) => {
          try {
            return await sendMessage({ space: values.space ?? '' }, values.text ?? '');
          } catch (error: unknown) {
            throw new Error(translateApiError(error));
          }
        }}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Chat</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return to services</Text>
      </Box>
    </Box>
  );
}