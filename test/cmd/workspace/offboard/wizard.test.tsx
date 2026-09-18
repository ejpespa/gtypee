import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink';
import { PassThrough } from 'node:stream';
import { OffboardUserWizard } from '../../../../src/cmd/workspace/OffboardUserWizard.js';

function renderInk(element: React.ReactElement) {
  const stdout = new PassThrough();
  let output = '';
  stdout.on('data', (chunk) => {
    output += chunk.toString();
  });

  const instance = render(element, {
    stdout: stdout as any,
    debug: true,
  });

  return {
    lastFrame: () => output,
    unmount: () => instance.unmount(),
    rerender: (newElement: React.ReactElement) => instance.rerender(newElement),
  };
}

describe('OffboardUserWizard', () => {
  it('renders confirmation prompt with safety warnings', () => {
    const onCancel = vi.fn();
    const onOffboard = vi.fn().mockResolvedValue({ success: true, steps: [] });

    const { lastFrame, unmount } = renderInk(
      <OffboardUserWizard email="test@example.com" onOffboard={onOffboard} onCancel={onCancel} />
    );

    const frame = lastFrame();
    expect(frame).toContain('Offboard User: test@example.com');
    expect(frame).toContain('Revoke OAuth');
    unmount();
  });
});
