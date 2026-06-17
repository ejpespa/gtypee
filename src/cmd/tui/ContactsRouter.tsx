import React from 'react';
import { ListContactsTui } from '../contacts/ListContactsTui.js';
import type { ContactsCommandDeps } from '../contacts/commands.js';

interface ContactsRouterProps {
  deps: Required<ContactsCommandDeps>;
  onCancel: () => void;
}

export function ContactsRouter({ deps, onCancel }: ContactsRouterProps) {
  return (
    <ListContactsTui
      contactsDeps={deps}
      onCancel={onCancel}
    />
  );
}