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

    // TODO(matt): wire to GET /api/calendar with the filters below
    const result = await callApi({
      path: '/api/calendar',
      query: {
        matterId: input.matter_id,
        attorneyId: input.attorney_id,
        type: input.event_type,
        daysAhead: input.days_ahead ?? 14,
        includePast: input.include_past ?? false,
      },
      auth: requestInfo?.req?.auth,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};
