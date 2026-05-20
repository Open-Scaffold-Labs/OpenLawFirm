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

    // TODO(matt): wire to GET /api/matters with the filters below.
    // For now, return a stub response so we can validate the MCP transport
    // and tool registration end-to-end.
    const result = await callApi({
      path: '/api/matters',
      query: {
        q: input.query,
        client: input.client_name,
        attorney: input.attorney_id,
        status: input.status,
        practiceArea: input.practice_area,
        limit: input.limit ?? 20,
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
