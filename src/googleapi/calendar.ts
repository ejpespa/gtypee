export type CalendarResponse = "accepted" | "declined" | "tentative" | "needsAction";

const responseAliases: Record<string, CalendarResponse> = {
  accept: "accepted",
  accepted: "accepted",
  yes: "accepted",
  decline: "declined",
  declined: "declined",
  no: "declined",
  tentative: "tentative",
  maybe: "tentative",
  needsaction: "needsAction",
  "needs-action": "needsAction",
};

export function normalizeCalendarResponse(input: string): CalendarResponse {
  const key = input.trim().toLowerCase();
  const normalized = responseAliases[key];
  if (normalized === undefined) {
    throw new Error("response must be one of: accepted, declined, tentative, needsAction");
  }
  return normalized;
}
