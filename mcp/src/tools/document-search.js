// Tool: document_search
// Search documents within a matter scope by filename, date range, type, or full-text.

import { z } from 'zod';
import { callApi } from '../api.js';
import { requireScope } from '../auth.js';

export const documentSearchTool = {
  name: 'document_search',
  description:
    'Search documents in OpenLawFirm. Scope to a single matter (recommended) or search ' +
    'across all matters the user has access to. Returns document metadata: id, filename, ' +
    'matter id, type, upload date, and a retrieval URL.',

  inputSchema: {
    matter_id: z
      .string()
      .optional()
      .describe('Optional: scope search to a single matter. Strongly recommended.'),
    query: z
      .string()
      .optional()
      .describe('Open-text search against filename and document content'),
    document_type: z
      .string()
      .optional()
      .describe('Filter by document type (e.g. pleading, contract, correspondence, medical_record)'),
    date_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe('Filter to documents uploaded on or after this date (YYYY-MM-DD)'),
    date_to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe('Filter to documents uploaded on or before this date (YYYY-MM-DD)'),
    limit: z.number().int().min(1).max(50).optional().describe('Max results, default 20'),
  },

  annotations: {
    title: 'Search documents',
    readOnlyHint: true,
    openWorldHint: false,
  },

  async handler(input, { requestInfo }) {
    requireScope(requestInfo?.req, 'openlawfirm:document:read');

    // TODO(matt): wire to GET /api/matters/:id/documents or /api/documents
    const path = input.matter_id
      ? `/api/matters/${encodeURIComponent(input.matter_id)}/documents`
      : '/api/documents';

    const result = await callApi({
      path,
      query: {
        q: input.query,
        type: input.document_type,
        from: input.date_from,
        to: input.date_to,
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
