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

export function googleSlidesUrl(presentationId: string): string {
  return `https://docs.google.com/presentation/d/${presentationId}/edit`;
}

export function googleFormUrl(formId: string): string {
  return `https://docs.google.com/forms/d/${formId}/edit`;
}

export function calendarEventUrl(eventId: string): string {
  return `https://calendar.google.com/calendar/event?eid=${encodeURIComponent(eventId)}`;
}

export function adminUserUrl(userKey: string): string {
  return `https://admin.google.com/ac/users/${encodeURIComponent(userKey)}`;
}

export function adminGroupUrl(groupEmail: string): string {
  return `https://admin.google.com/ac/groups/${encodeURIComponent(groupEmail)}`;
}

export function adminDeviceUrl(deviceId: string): string {
  return `https://admin.google.com/ac/devices/details?deviceId=${encodeURIComponent(deviceId)}`;
}