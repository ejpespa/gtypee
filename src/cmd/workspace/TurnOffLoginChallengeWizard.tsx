import React from 'react';
import { TuiWizard } from '../tui/TuiWizard.js';
import { adminUserSecurityUrl } from '../tui/resourceLinks.js';
import { openInBrowser } from '../tui/systemActions.js';

export interface TurnOffLoginChallengeWizardProps {
  prefillEmail?: string;
  onCancel?: () => void;
}

const LOGIN_CHALLENGE_HELP = [
  'Google has no public API for this action.',
  'Admin Console will open on the user Security page.',
  'Click Login challenge → Turn Off For 10 Minutes.',
  'Changes can take a few minutes to apply.',
].join('\n');

export function TurnOffLoginChallengeWizard({
  prefillEmail,
  onCancel,
}: TurnOffLoginChallengeWizardProps) {
  return (
    <TuiWizard
      title="Turn Off Login Challenge (10 min)"
      fields={[
        {
          key: 'email',
          label: 'Email',
          required: true,
          ...(prefillEmail ? { fixedValue: prefillEmail } : {}),
        },
      ]}
      summary={(values) => [
        `Open login challenge settings for ${values.email}?`,
        LOGIN_CHALLENGE_HELP,
      ].join('\n\n')}
      onCancel={() => onCancel?.()}
      onSubmit={async (values) => {
        const email = (values.email ?? '').trim();
        await openInBrowser(adminUserSecurityUrl(email));
        return [
          `Opened Security for ${email}.`,
          'Click Login challenge → Turn Off For 10 Minutes.',
        ].join(' ');
      }}
    />
  );
}