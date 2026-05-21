// Tool: trust_balance
// Query IOLTA trust balance for a client or matter, including last reconciliation date.
//
// COMPLIANCE NOTE: This tool is read-only. Modifications to trust accounts MUST go
// through the OpenLawFirm UI for proper three-way reconciliation and audit trail.
// We deliberately do not expose trust deposit/disbursement via MCP in v0.1.

import { z } from 'zod';
import { callApi } from '../api.js';
import { requireScope } from '../auth.js';

export const trustBalanceTool = {
  name: 'trust_balance',
  description:
    'Query IOLTA trust account balance for a client or matter. Returns current balance, ' +
    'last deposit, last disbursement, last three-way reconciliation date, and any ' +
    'out-of-balance alerts. Read-only — trust account modifications must use the OpenLawFirm ' +
    'UI to preserve the audit trail.',

  inputSchema: {
    client_id: z.string().optional().describe('Query balance for a specific client'),
    matter_id: z.string().optional().describe('Query balance for a specific matter'),
  },

  annotations: {
    title: 'Query trust balance',
    readOnlyHint: true,
    openWorldHint: false,
  },

  async handler(input, { requestInfo }) {
    requireScope(requestInfo?.req, 'openlawfirm:trust:read');

    if (!input.client_id && !input.matter_id) {
      throw new Error('Provide either client_id or matter_id');
    }

    // Two requests in parallel: the client-trust-ledger row(s) and the recent
    // transactions for the same scope, so Claude can present a balance + recent
    // activity summary in one response.
    const [ledger, transactions] = await Promise.all([
      callApi({
        path: '/api/trust/client-ledger',
        query: { client_id: input.client_id, matter_id: input.matter_id },
        auth: requestInfo?.req?.auth,
      }),
      callApi({
        path: '/api/trust/transactions',
        query: { client_id: input.client_id, matter_id: input.matter_id },
        auth: requestInfo?.req?.auth,
      }),
    ]);

    const ledgerRows = Array.isArray(ledger) ? ledger : [];
    const totalBalance = ledgerRows.reduce((acc, r) => acc + parseFloat(r.balance || 0), 0);
    const recentTxns = (Array.isArray(transactions) ? transactions : []).slice(0, 10).map((t) => ({
      date: t.transaction_date,
      type: t.transaction_type,
      amount: t.amount,
      running_balance: t.running_balance,
      description: t.description,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              total_balance: totalBalance,
              ledger: ledgerRows,
              recent_transactions: recentTxns,
              note: 'Trust account modifications must be made via the OpenLawFirm UI to preserve the three-way reconciliation audit trail.',
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};
