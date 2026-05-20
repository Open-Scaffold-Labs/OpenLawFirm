// MCP server setup. Registers all tools and exposes a Streamable HTTP handler
// suitable for mounting in an Express app.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { tools } from './tools/index.js';

/**
 * Creates an MCP server with all OpenLawFirm tools registered.
 *
 * @returns {Promise<{ server: McpServer, handler: import('express').Handler }>}
 */
export async function createMcpServer() {
  const server = new McpServer({
    name: 'openlawfirm-mcp',
    version: '0.1.0',
  });

  // Register every tool from src/tools/index.js
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      },
      tool.handler,
    );
  }

  // Streamable HTTP transport — required for remote MCP server deployment
  // per Anthropic Connectors Directory requirements.
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    enableJsonResponse: true,
  });

  await server.connect(transport);

  /** @type {import('express').Handler} */
  const handler = async (req, res) => {
    try {
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('MCP transport error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'internal_error', detail: String(err?.message || err) });
      }
    }
  };

  return { server, handler };
}
