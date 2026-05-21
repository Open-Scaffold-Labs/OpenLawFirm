// Tool: calendar_query
// Query upcoming deadlines, hearings, and statutes of limitations.

import { z } from 'zod';
import { callApi } from '../api.js';
import { requireScope } from '../auth.js';

export const calendarQueryTool = {
  name: 'calendar_query',
  description:
    'Query upcoming calendar events: court dates, hearings, filing deadlines, statutes ' +
    'of limitations, and matter milestones. Scope to a single matter, a single attorney, ' +
    'or the whole firm. Default window is the next 14 days.',

  inputSchema: {
    matter_id: z.string().optional().describe('Scope to events on a single matter'),
    attorney_id: z.string().optional().describe("Scope to a single attorney's calendar"),
    event_type: z
      .enum(['hearing', 'filing_deadline', 'statute_of_limitations', 'meeting', 'milestone', 'other'])
      .optional()
      .describe('Filter by event type'),
    days_ahead: z
      .number()
      .int()
      .min(1)
      .max(365)
      .optional()
      .describe('Lookahead window in days. Default 14, max 365.'),
    include_past: z
      .boolean()
      .optional()
      .describe('Include past events. Default false.'),
  },

  annotations: {
    title: 'Query calendar',
    readOnlyHint: true,
    openWorldHint: false,
  },

  async handler(input, { requestInfo }) {
    requireScope(requestInfo?.req, 'openlawfirm:calendar:read');

    const daysAhead = input.days_ahead ?? 14;
    const today = new Date();
    const dateFrom = input.include_past ? undefined : today.toISOString().slice(0, 10);
    const dateTo = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const result = await callApi({
      path: '/api/calendar',
      query: {
        matter_id: input.matter_id,
        user_id: input.attorney_id,
        event_type: input.event_type,
        date_from: dateFrom,
        date_to: dateTo,
      },
      auth: requestInfo?.req?.auth,
    });

    const events = (Array.isArray(result) ? result : []).map((e) => ({
      id: e.id,
      title: e.title,
      type: e.event_type,
      start_time: e.start_time,
      end_time: e.end_time,
      all_day: e.all_day,
      location: e.location,
      matter: e.matter_title,
      matter_number: e.matter_number,
      attorney: e.user_name,
      is_court_date: e.is_court_date,
    }));

    return {
      content: [
        {
          type: 'text',
          text: `Found ${events.length} event(s) in the next ${daysAhead} day(s):\n\n${JSON.stringify(events, null, 2)}`,
        },
      ],
    };
  },
};
