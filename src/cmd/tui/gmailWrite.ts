export function parseSenderEmail(from: string): string {
  const match = /<([^>]+)>/.exec(from);
  if (match) return match[1]!.trim();
  return from.trim();
}

export function buildReplySubject(subject: string): string {
  if (subject.toLowerCase().startsWith('re:')) return subject;
  return `Re: ${subject}`;
}

export function isMessageUnread(labelIds: string[] | undefined): boolean {
  return (labelIds ?? []).includes('UNREAD');
}