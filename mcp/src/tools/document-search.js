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

    if (!input.matter_id) {
      // v0.1: OpenLawFirm only exposes documents scoped to a matter.
      // A firm-wide document search endpoint is on the Phase 2 punch list.
      return {
        content: [
          {
            type: 'text',
            text:
              'Document search currently requires a matter_id (firm-wide search not yet ' +
              'implemented in the OpenLawFirm API). Please specify which matter you want ' +
              'to search documents within.',
          },
        ],
      };
    }

    const result = await callApi({
      path: `/api/matters/${encodeURIComponent(input.matter_id)}/documents`,
      auth: requestInfo?.req?.auth,
    });

    // Client-side filtering for the v0.1 surface (the matter documents endpoint
    // returns all docs; we filter to the requested type, date range, and query).
    const docs = Array.isArray(result) ? result : [];
    const filtered = docs
      .filter((d) => !input.document_type || d.document_type === input.document_type)
      .filter((d) => {
        if (input.date_from && d.uploaded_at < input.date_from) return false;
        if (input.date_to && d.uploaded_at > input.date_to + 'T23:59:59') return false;
        return true;
      })
      .filter((d) => {
        if (!input.query) return true;
        const q = input.query.toLowerCase();
        return (
          (d.filename || '').toLowerCase().includes(q) ||
          (d.title || '').toLowerCase().includes(q) ||
          (d.description || '').toLowerCase().includes(q)
        );
      })
      .slice(0, input.limit ?? 20);

    return {
      content: [
        {
          type: 'text',
          text: `Found ${filtered.length} document(s) on matter ${input.matter_id}:\n\n${JSON.stringify(filtered, null, 2)}`,
        },
      ],
    };
  },
};
