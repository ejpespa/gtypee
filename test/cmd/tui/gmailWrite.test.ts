import { describe, expect, it } from 'vitest';
import { buildReplySubject, isMessageUnread, parseSenderEmail } from '../../../src/cmd/tui/gmailWrite.js';

describe('gmailWrite helpers', () => {
  it('parses email from formatted From header', () => {
    expect(parseSenderEmail('Ada Lovelace <ada@example.com>')).toBe('ada@example.com');
  });

  it('builds reply subject once', () => {
    expect(buildReplySubject('Hello')).toBe('Re: Hello');
    expect(buildReplySubject('Re: Hello')).toBe('Re: Hello');
  });

  it('detects unread label', () => {
    expect(isMessageUnread(['INBOX', 'UNREAD'])).toBe(true);
    expect(isMessageUnread(['INBOX'])).toBe(false);
  });
});