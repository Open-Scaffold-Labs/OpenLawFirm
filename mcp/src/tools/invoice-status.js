// Tool: invoice_status
// Query invoice status and outstanding balance for a matter or client.

import { z } from 'zod';
import { callApi } from '../api.js';
import { requireScope } from '../auth.js';

export const invoiceStatusTool = {
  name: 'invoice_status',
  description:
    'Query invoice status for a matter or client. Returns invoice id, amount, status ' +
    '(draft, sent, partial, paid, overdue), outstanding balance, due date, and last ' +
    'payment date. Useful for collections triage and managing-partner dashboards.',

  inputSchema: {
    matter_id: z.string().optional().describe('Filter to invoices for a single matter'),
    client_id: z.string().optional().describe('Filter to invoices for a single client'),
    status: z
      .enum(['draft', 'sent', 'partial', 'paid', 'overdue', 'void'])
      .optional()
      .describe('Filter by invoice status'),
    days_overdue: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Filter to invoices overdue by at least N days'),
    limit: z.number().int().min(1).max(50).optional().describe('Max results, default 20'),
  },

  annotations: {
    title: 'Query invoice status',
    readOnlyHint: true,
    openWorldHint: false,
  },

  async handler(input, { requestInfo }) {
    requireScope(requestInfo?.req, 'openlawfirm:invoice:read');

    // TODO(matt): wire to GET /api/invoices with the filters below
    const result = await callApi({
      path: '/api/invoices',
      query: {
        matterId: input.matter_id,
        clientId: input.client_id,
        status: input.status,
        daysOverdue: input.days_overdue,
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
