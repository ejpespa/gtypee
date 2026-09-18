import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TuiConfirmPrompt } from '../tui/TuiConfirmPrompt.js';
import type { OffboardSummary, OffboardUserOptions, OffboardStepResult } from './offboard/types.js';

export interface OffboardUserWizardProps {
  email: string;
  onOffboard: (opts: OffboardUserOptions, onStepUpdate: (s: OffboardStepResult) => void) => Promise<OffboardSummary>;
  onCancel: () => void;
}

export function OffboardUserWizard({ email, onOffboard, onCancel }: OffboardUserWizardProps) {
  const [phase, setPhase] = useState<'confirm' | 'running' | 'result'>('confirm');
  const [liveSteps, setLiveSteps] = useState<OffboardStepResult[]>([]);
  const [summary, setSummary] = useState<OffboardSummary | null>(null);

  useInput((_input, key) => {
    if (phase === 'result' && key.escape) {
      onCancel();
    }
  });

  const handleConfirm = async () => {
    setPhase('running');
    try {
      const res = await onOffboard(
        { email, wipeDevices: true, removeFromGroups: true },
        (step) => setLiveSteps((prev) => [...prev.filter((s) => s.name !== step.name), step])
      );
      setSummary(res);
      setPhase('result');
    } catch (err) {
      setSummary({
        email,
        dryRun: false,
        success: false,
        completedAt: new Date().toISOString(),
        steps: [{ name: 'Offboarding initialization', status: 'failed', error: String(err) }],
      });
      setPhase('result');
    }
  };

  if (phase === 'running') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="yellow">
        <Text bold color="cyan">Offboarding: {email}</Text>
        <Text color="yellow">Executing security containment pipeline...</Text>
        <Box flexDirection="column" marginTop={1}>
          {liveSteps.map((s, idx) => (
            <Text key={idx} color={s.status === 'success' ? 'green' : s.status === 'failed' ? 'red' : 'yellow'}>
              {s.status === 'success' ? '[✓]' : s.status === 'failed' ? '[✗]' : '[>]'} {s.name} {s.detail ? `(${s.detail})` : ''}
            </Text>
          ))}
        </Box>
      </Box>
    );
  }

  if (phase === 'result') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor={summary?.success ? 'green' : 'red'}>
        <Text bold color="cyan">Offboard Result: {email}</Text>
        <Text color={summary?.success ? 'green' : 'red'}>
          {summary?.success ? 'Offboard Completed Successfully' : 'Offboard Failed / Halted'}
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {summary?.steps.map((s, idx) => (
            <Text key={idx} color={s.status === 'success' ? 'green' : s.status === 'failed' ? 'red' : 'gray'}>
              • [{s.status.toUpperCase()}] {s.name} {s.detail ? `(${s.detail})` : ''}{s.error ? ` - ${s.error}` : ''}
            </Text>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Press ESC to return</Text>
        </Box>
      </Box>
    );
  }

  return (
    <TuiConfirmPrompt
      title={`Offboard User: ${email}`}
      message={`Are you sure you want to offboard ${email}?\n• Suspend account\n• Scramble password & clear recovery\n• Revoke OAuth tokens & active web sessions\n• Issue selective wipe to enrolled mobile devices\n• Leave all Google Groups`}
      destructive={true}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    />
  );
}
