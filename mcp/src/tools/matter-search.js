// Tool: matter_search
// Search matters by client name, attorney, status, practice area, or open text.

import { z } from 'zod';
import { callApi } from '../api.js';
import { requireScope } from '../auth.js';

export const matterSearchTool = {
  name: 'matter_search',
  description:
    'Search matters in OpenLawFirm. Filter by client name, responsible attorney, status, ' +
    'practice area, or open-text query against matter name and description. Returns up to ' +
    '20 matches with matter id, name, client, responsible attorney, status, and open date.',

  inputSchema: {
    query: z
      .string()
      .optional()
      .describe('Open-text search against matter name and description'),
    client_name: z.string().optional().describe('Filter by client name (partial match)'),
    attorney_id: z.string().optional().describe('Filter by responsible attorney id'),
    status: z
      .enum(['open', 'pending', 'closed', 'on_hold'])
      .optional()
      .describe('Filter by matter status'),
    practice_area: z.string().optional().describe('Filter by practice area slug'),
    limit: z.number().int().min(1).max(50).optional().describe('Max results, default 20'),
  },

  annotations: {
    title: 'Search matters',
    readOnlyHint: true,
    openWorldHint: false,
  },

  async handler(input, { requestInfo }) {
    requireScope(requestInfo?.req, 'openlawfirm:matter:read');

    // The OpenLawFirm API supports `search` (text against matter_number, title,
    // and client last_name), `status`, `practice_area_id`, and `attorney_id`.
    // We merge `query` and `client_name` into the single `search` param.
    const searchText = [input.query, input.client_name].filter(Boolean).join(' ').trim();

    const result = await callApi({
      path: '/api/matters',
      query: {
        search: searchText || undefined,
        attorney_id: input.attorney_id,
        status: input.status,
        practice_area_id: input.practice_area,
      },
      auth: requestInfo?.req?.auth,
    });

    // Trim to the requested limit and project a smaller shape so Claude doesn't
    // receive every column from the wide matters query.
    const limited = (Array.isArray(result) ? result : []).slice(0, input.limit ?? 20).map((m) => ({
      id: m.id,
      matter_number: m.matter_number,
      title: m.title,
      status: m.status,
      practice_area: m.practice_area_name,
      responsible_attorney: m.attorney_name,
      client: m.company_name || `${m.client_first ?? ''} ${m.client_last ?? ''}`.trim(),
      date_opened: m.date_opened,
      total_hours: m.total_hours,
      total_billed: m.total_billed,
      trust_balance: m.trust_balance,
    }));

    return {
      content: [
        {
          type: 'text',
          text: `Found ${limited.length} matter(s):\n\n${JSON.stringify(limited, null, 2)}`,
        },
      ],
    };
  },
};
