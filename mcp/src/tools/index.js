// Tool registry. Exports an array of every tool the MCP server should register.

import { matterSearchTool } from './matter-search.js';
import { matterGetTool } from './matter-get.js';
import { timeEntryCreateTool } from './time-entry-create.js';
import { documentSearchTool } from './document-search.js';
import { invoiceStatusTool } from './invoice-status.js';
import { trustBalanceTool } from './trust-balance.js';
import { calendarQueryTool } from './calendar-query.js';

export const tools = [
  matterSearchTool,
  matterGetTool,
  timeEntryCreateTool,
  documentSearchTool,
  invoiceStatusTool,
  trustBalanceTool,
  calendarQueryTool,
];
