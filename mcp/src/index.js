// openlawfirm-mcp entry point.
// Boots an Express app that hosts the MCP server at /mcp.

import express from 'express';
import { createMcpServer } from './server.js';
import { authMiddleware } from './auth.js';

const PORT = Number(process.env.PORT) || 3825;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://claude.ai,https://claude.com')
  .split(',')
  .map((s) => s.trim());

const app = express();
app.use(express.json({ limit: '1mb' }));

// CORS — restrict to Anthropic Claude origins
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Session-Id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Origin-header validation (Anthropic Connectors Directory requirement)
app.use('/mcp', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'origin_not_allowed' });
  }
  next();
});

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'openlawfirm-mcp', version: '0.1.0' });
});

// MCP discovery metadata
app.get('/.well-known/mcp-server', (_req, res) => {
  res.json({
    name: 'OpenLawFirm',
    version: '0.1.0',
    description: 'Matter, time, trust, document, invoice, and calendar tools for law firm practice management.',
    publisher: 'Open Scaffold Labs, LLC',
    homepage: 'https://github.com/Open-Scaffold-Labs/OpenLawFirm',
    auth: {
      type: 'oauth2',
      authorization_url: process.env.OSO_AUTHORIZATION_URL || 'https://auth.openscaffoldlabs.com/authorize',
      token_url: process.env.OSO_TOKEN_URL || 'https://auth.openscaffoldlabs.com/token',
      scopes: [
        'openlawfirm:matter:read',
        'openlawfirm:time:write',
        'openlawfirm:document:read',
        'openlawfirm:invoice:read',
        'openlawfirm:trust:read',
        'openlawfirm:calendar:read',
      ],
    },
  });
});

// Mount MCP server (with auth middleware enforcing JWT validation)
const mcpServer = await createMcpServer();
app.use('/mcp', authMiddleware, mcpServer.handler);

app.listen(PORT, () => {
  console.log(`openlawfirm-mcp listening on port ${PORT}`);
  console.log(`Health:        http://localhost:${PORT}/health`);
  console.log(`Discovery:     http://localhost:${PORT}/.well-known/mcp-server`);
  console.log(`MCP endpoint:  http://localhost:${PORT}/mcp`);
});
