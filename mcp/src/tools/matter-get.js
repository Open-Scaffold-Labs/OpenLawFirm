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

    // TODO(matt): wire to GET /api/matters/:id
    const result = await callApi({
      path: `/api/matters/${encodeURIComponent(input.matter_id)}`,
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
