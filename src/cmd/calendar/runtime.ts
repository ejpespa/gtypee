import { google } from "googleapis";

import { ServiceRuntime, type ServiceRuntimeOptions } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { CalendarResponse } from "../../googleapi/calendar.js";
import type {
  CalendarCommandDeps,
  CalendarConflict,
  CalendarEventSummary,
} from "./commands.js";

function toResponseStatus(response: CalendarResponse): string {
  switch (response) {
    case "accepted":
      return "accepted";
    case "declined":
      return "declined";
    case "tentative":
      return "tentative";
    case "needsAction":
      return "needsAction";
  }
}

export function buildCalendarCommandDeps(options: ServiceRuntimeOptions): Required<CalendarCommandDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    listEvents: async (query) => {
      const auth = await runtime.getClient(scopes("calendar"));
      const calendar = google.calendar({ version: "v3", auth });

      const params: {
        calendarId: string;
        singleEvents: boolean;
        orderBy: string;
        maxResults: number;
        timeMin?: string;
        timeMax?: string;
      } = {
        calendarId: "primary",
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 250,
      };

      if (query.from !== undefined) {
        params.timeMin = query.from;
      }
      if (query.to !== undefined) {
        params.timeMax = query.to;
      }

      const response = await calendar.events.list(params);
      const items = response.data.items ?? [];

      return items.map((event): CalendarEventSummary => ({
        id: event.id ?? "",
        summary: event.summary ?? "(no title)",
        start: event.start?.dateTime ?? event.start?.date ?? "",
      }));
    },

    createEvent: async (input) => {
      const auth = await runtime.getClient(scopes("calendar"));
      const calendar = google.calendar({ version: "v3", auth });

      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: input.summary,
          start: { dateTime: input.start },
          end: { dateTime: input.end },
        },
      });

      return {
        id: response.data.id ?? "",
        created: response.status === 200,
      };
    },

    updateEvent: async (input) => {
      const auth = await runtime.getClient(scopes("calendar"));
      const calendar = google.calendar({ version: "v3", auth });

      const requestBody: { summary?: string; start?: { dateTime: string }; end?: { dateTime: string } } = {};
      if (input.summary !== undefined) {
        requestBody.summary = input.summary;
      }
      if (input.start !== undefined) {
        requestBody.start = { dateTime: input.start };
      }
      if (input.end !== undefined) {
        requestBody.end = { dateTime: input.end };
      }

      const response = await calendar.events.patch({
        calendarId: "primary",
        eventId: input.id,
        requestBody,
      });

      return {
        id: response.data.id ?? "",
        updated: response.status === 200,
      };
    },

    respondEvent: async (input) => {
      const auth = await runtime.getClient(scopes("calendar"));
      const calendar = google.calendar({ version: "v3", auth });

      // Fetch the current event to find the authenticated user's attendee entry
      const existing = await calendar.events.get({
        calendarId: "primary",
        eventId: input.id,
      });

      const attendees = existing.data.attendees ?? [];
      const selfAttendee = attendees.find((a) => a.self === true);

      if (selfAttendee === undefined) {
        // If the user is not in the attendees list, add them with the response
        attendees.push({
          self: true,
          responseStatus: toResponseStatus(input.response),
        });
      } else {
        selfAttendee.responseStatus = toResponseStatus(input.response);
      }

      const response = await calendar.events.patch({
        calendarId: "primary",
        eventId: input.id,
        requestBody: { attendees },
      });

      return {
        id: response.data.id ?? "",
        response: input.response,
        applied: response.status === 200,
      };
    },

    listConflicts: async (query) => {
      const auth = await runtime.getClient(scopes("calendar"));
      const calendar = google.calendar({ version: "v3", auth });

      const params: {
        calendarId: string;
        singleEvents: boolean;
        orderBy: string;
        maxResults: number;
        timeMin?: string;
        timeMax?: string;
      } = {
        calendarId: "primary",
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 250,
      };

      if (query.from !== undefined) {
        params.timeMin = query.from;
      }
      if (query.to !== undefined) {
        params.timeMax = query.to;
      }

      const response = await calendar.events.list(params);
      const items = response.data.items ?? [];

      // Sort by start time and detect pairwise overlaps
      const sorted = items
        .filter((e) => e.start?.dateTime !== undefined && e.end?.dateTime !== undefined)
        .sort((a, b) => {
          const aStart = a.start!.dateTime!;
          const bStart = b.start!.dateTime!;
          return aStart < bStart ? -1 : aStart > bStart ? 1 : 0;
        });

      const conflicts: CalendarConflict[] = [];

      for (let i = 0; i < sorted.length; i++) {
        const a = sorted[i]!;
        for (let j = i + 1; j < sorted.length; j++) {
          const b = sorted[j]!;

          const aEnd = a.end!.dateTime!;
          const bStart = b.start!.dateTime!;

          // If b starts at or after a ends, no overlap (and no further overlaps since sorted)
          if (bStart >= aEnd) break;

          const bEnd = b.end!.dateTime!;
          const aStart = a.start!.dateTime!;

          // Overlap exists: compute the intersection
          const overlapStart = aStart > bStart ? aStart : bStart;
          const overlapEnd = aEnd < bEnd ? aEnd : bEnd;

          conflicts.push({
            firstId: a.id ?? "",
            secondId: b.id ?? "",
            overlapStart,
            overlapEnd,
          });
        }
      }

      return conflicts;
    },
  };
}
