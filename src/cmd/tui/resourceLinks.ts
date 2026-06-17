export function gmailMessageUrl(messageId: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${messageId}`;
}

export function gmailThreadUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${threadId}`;
}

export function driveFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function googleDocUrl(docId: string): string {
  return `https://docs.google.com/document/d/${docId}/edit`;
}

export function googleSheetUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
}

export function calendarEventUrl(eventId: string): string {
  return `https://calendar.google.com/calendar/event?eid=${encodeURIComponent(eventId)}`;
}