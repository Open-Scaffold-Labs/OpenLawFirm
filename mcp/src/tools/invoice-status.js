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

    const result = await callApi({
      path: '/api/invoices',
      query: {
        matter_id: input.matter_id,
        client_id: input.client_id,
        status: input.status,
      },
      auth: requestInfo?.req?.auth,
    });

    // Days-overdue filter applied client-side (not yet in the API).
    const today = new Date().toISOString().slice(0, 10);
    const docs = Array.isArray(result) ? result : [];
    const filtered = docs
      .filter((inv) => {
        if (input.days_overdue == null) return true;
        if (!inv.due_date || !inv.balance_due || parseFloat(inv.balance_due) <= 0) return false;
        const due = new Date(inv.due_date).getTime();
        const ageDays = (new Date(today).getTime() - due) / (1000 * 60 * 60 * 24);
        return ageDays >= input.days_overdue;
      })
      .slice(0, input.limit ?? 20)
      .map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        matter: inv.matter_title,
        client: inv.company_name || `${inv.client_first ?? ''} ${inv.client_last ?? ''}`.trim(),
        status: inv.status,
        total_amount: inv.total_amount,
        balance_due: inv.balance_due,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
      }));

    return {
      content: [
        {
          type: 'text',
          text: `Found ${filtered.length} invoice(s):\n\n${JSON.stringify(filtered, null, 2)}`,
        },
      ],
    };
  },
};
