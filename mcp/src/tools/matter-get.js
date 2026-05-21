// Tool: matter_get
// Retrieve full matter detail including parties, key dates, recent activity, and documents.

import { z } from 'zod';
import { callApi } from '../api.js';
import { requireScope } from '../auth.js';

export const matterGetTool = {
  name: 'matter_get',
  description:
    'Retrieve full detail for a single matter by ID. Returns matter metadata, client, ' +
    'parties, key dates, billing summary, trust balance, recent time entries, and a list ' +
    'of attached documents.',

  inputSchema: {
    matter_id: z.string().describe('OpenLawFirm matter id (e.g. olf-matter-1234)'),
  },

  annotations: {
    title: 'Get matter detail',
    readOnlyHint: true,
    openWorldHint: false,
  },

  async handler(input, { requestInfo }) {
    requireScope(requestInfo?.req, 'openlawfirm:matter:read');

    const matter = await callApi({
      path: `/api/matters/${encodeURIComponent(input.matter_id)}`,
      auth: requestInfo?.req?.auth,
    });

    // Pull a few related listings in parallel so Claude has full context.
    const [timeEntries, documents, calendar] = await Promise.all([
      callApi({
        path: `/api/matters/${encodeURIComponent(input.matter_id)}/time-entries`,
        auth: requestInfo?.req?.auth,
      }).catch(() => []),
      callApi({
        path: `/api/matters/${encodeURIComponent(input.matter_id)}/documents`,
        auth: requestInfo?.req?.auth,
      }).catch(() => []),
      callApi({
        path: '/api/calendar',
        query: { matter_id: input.matter_id },
        auth: requestInfo?.req?.auth,
      }).catch(() => []),
    ]);

    const detail = {
      matter: {
        id: matter.id,
        matter_number: matter.matter_number,
        title: matter.title,
        status: matter.status,
        client: matter.company_name || `${matter.client_first ?? ''} ${matter.client_last ?? ''}`.trim(),
        client_email: matter.client_email,
        practice_area: matter.practice_area_name,
        responsible_attorney: matter.attorney_name,
        date_opened: matter.date_opened,
        date_closed: matter.date_closed,
        statute_of_limitations: matter.statute_of_limitations,
        court_name: matter.court_name,
        case_number: matter.case_number,
        opposing_party: matter.opposing_party,
        opposing_counsel: matter.opposing_counsel,
        billing_type: matter.billing_type,
        billing_rate: matter.billing_rate,
        notes: matter.notes,
      },
      recent_time_entries: Array.isArray(timeEntries) ? timeEntries.slice(0, 10) : [],
      documents: Array.isArray(documents) ? documents.slice(0, 20) : [],
      upcoming_calendar: Array.isArray(calendar) ? calendar.slice(0, 10) : [],
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(detail, null, 2),
        },
      ],
    };
  },
};
