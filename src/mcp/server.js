/**
 * MCP Server — Model Context Protocol integration
 *
 * Allows Claude Desktop, Hermes, and other MCP clients
 * to control the Minecraft bot.
 */

import express from 'express';
import { log } from '../utils/logger.js';

export async function startMCPServer(opts = {}) {
  const port = parseInt(opts.port) || 8088;
  const app = express();
  app.use(express.json());

  let agent = null;

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '0.0.1-beta.1' });
  });

  // MCP tool listing
  app.post('/tools/list', (req, res) => {
    res.json({
      tools: [
        {
          name: 'minecraft_move',
          description: 'Move the bot to coordinates',
          inputSchema: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              z: { type: 'number' },
            },
            required: ['x', 'y', 'z'],
          },
        },
        {
          name: 'minecraft_mine',
          description: 'Mine a block type',
          inputSchema: {
            type: 'object',
            properties: {
              block: { type: 'string' },
              count: { type: 'number', default: 1 },
            },
            required: ['block'],
          },
        },
        {
          name: 'minecraft_chat',
          description: 'Send a chat message',
          inputSchema: {
            type: 'object',
            properties: { message: { type: 'string' } },
            required: ['message'],
          },
        },
        {
          name: 'minecraft_execute',
          description: 'Execute a natural language task',
          inputSchema: {
            type: 'object',
            properties: { task: { type: 'string' } },
            required: ['task'],
          },
        },
        {
          name: 'minecraft_command',
          description: 'Run a server command',
          inputSchema: {
            type: 'object',
            properties: { command: { type: 'string' } },
            required: ['command'],
          },
        },
        {
          name: 'minecraft_state',
          description: 'Get current bot state',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    });
  });

  // MCP tool execution
  app.post('/tools/call', async (req, res) => {
    const { name, arguments: args } = req.body;
    if (!agent) return res.json({ error: 'Agent not connected' });

    try {
      let result;
      switch (name) {
        case 'minecraft_move':
          result = await agent.go(args.x, args.y, args.z);
          break;
        case 'minecraft_mine':
          result = await agent.mine(args.block);
          break;
        case 'minecraft_chat':
          agent.bot.chat(args.message);
          result = `Said: ${args.message}`;
          break;
        case 'minecraft_execute':
          result = await agent.execute(args.task);
          break;
        case 'minecraft_command':
          result = await agent.executeCommand('mcp', args.command);
          break;
        case 'minecraft_state':
          result = JSON.stringify(agent.getState());
          break;
        default:
          result = `Unknown tool: ${name}`;
      }
      res.json({ content: [{ type: 'text', text: String(result) }] });
    } catch (err) {
      res.json({ content: [{ type: 'text', text: `Error: ${err.message}` }] });
    }
  });

  // Connect agent externally
  app.post('/agent/connect', async (req, res) => {
    try {
      const { MinecraftUse } = await import('../agent/agent.js');
      const { loadConfig } = await import('../utils/config.js');
      const config = await loadConfig(req.body.config);
      agent = new MinecraftUse(config);
      await agent.start();
      res.json({ status: 'connected', username: agent.bot?.username });
    } catch (err) {
      res.json({ error: err.message });
    }
  });

  return new Promise((resolve) => {
    app.listen(port, () => {
      log.info(`MCP server running on http://localhost:${port}`);
      resolve(app);
    });
  });
}
