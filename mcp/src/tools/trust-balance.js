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

    // TODO(matt): wire to GET /api/trust/client-ledger (with client_id or matter_id query)
    const result = await callApi({
      path: '/api/trust/client-ledger',
      query: {
        clientId: input.client_id,
        matterId: input.matter_id,
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
