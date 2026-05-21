// Tool: time_entry_create
// Create a time entry on a matter. This is the only DESTRUCTIVE tool in v0.1
// (creates new state) — every other tool is read-only.

import { z } from 'zod';
import { callApi } from '../api.js';
import { requireScope } from '../auth.js';

export const timeEntryCreateTool = {
  name: 'time_entry_create',
  description:
    'Create a billable or non-billable time entry on a matter. Hours must be in 0.1 ' +
    '(six-minute) increments per industry convention. Specify a LEDES activity code ' +
    '(e.g. L110 Fact Investigation, L120 Analysis/Strategy) when possible — entries ' +
    'without LEDES codes cannot be exported via LEDES 1998B and require manual coding ' +
    'before invoicing.',

  inputSchema: {
    matter_id: z.string().describe('OpenLawFirm matter id'),
    hours: z
      .number()
      .multipleOf(0.1)
      .min(0.1)
      .describe('Hours in 0.1 (six-minute) increments. Example: 0.2 = 12 minutes'),
    narrative: z.string().min(1).describe('Description of work performed'),
    activity_code: z
      .string()
      .optional()
      .describe('LEDES activity code (e.g. L110, L120, L130). Strongly recommended.'),
    task_code: z
      .string()
      .optional()
      .describe('UTBMS task code (optional, depends on matter type)'),
    billable: z.boolean().optional().describe('Whether the entry is billable. Defaults to true.'),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe('Entry date in YYYY-MM-DD format. Defaults to today.'),
  },

  annotations: {
    title: 'Create time entry',
    readOnlyHint: false,
    destructiveHint: false, // Creates new state but does not modify existing entries
    idempotentHint: false,
    openWorldHint: false,
  },

  async handler(input, { requestInfo }) {
    requireScope(requestInfo?.req, 'openlawfirm:time:write');

    const result = await callApi({
      path: '/api/time-entries',
      method: 'POST',
      body: {
        matter_id: input.matter_id,
        entry_date: input.date,
        hours: input.hours,
        description: input.narrative,
        activity_code: input.activity_code,
        task_code: input.task_code,
        billable: input.billable ?? true,
      },
      auth: requestInfo?.req?.auth,
    });

    return {
      content: [
        {
          type: 'text',
          text:
            `Time entry created.\n\n` +
            `Matter: ${input.matter_id}\n` +
            `Hours:  ${input.hours.toFixed(1)}\n` +
            `Code:   ${input.activity_code || '(none)'}\n` +
            `Note:   ${input.narrative}\n\n` +
            `Server response:\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  },
};
