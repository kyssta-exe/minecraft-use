/**
 * API Server — REST + WebSocket for agent integration
 *
 * Any agent (Hermes, OpenClaw, Claude, etc.) can connect via:
 * - REST API (HTTP POST/GET)
 * - WebSocket (real-time events)
 * - MCP Protocol (Claude Desktop)
 * - Webhooks (push notifications)
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { log } from '../utils/logger.js';

export class APIServer {
  constructor(agent, config = {}) {
    this.agent = agent;
    this.port = config.port || 8088;
    this.app = express();
    this.server = null;
    this.wss = null;
    this.webhooks = new Map();
    this.clients = new Set();

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') return res.sendStatus(200);
      next();
    });
  }

  setupRoutes() {
    const r = this.app;

    // === Health & Info ===
    r.get('/health', (req, res) => res.json({ status: 'ok', version: '0.0.1-beta.1', uptime: process.uptime() }));
    r.get('/info', (req, res) => res.json(this.agent.getState()));

    // === Agent Control ===
    r.post('/agent/start', async (req, res) => {
      try {
        await this.agent.start();
        this.broadcast('agent:started', this.agent.getState());
        res.json({ ok: true, state: this.agent.getState() });
      } catch (e) { res.status(500).json({ error: e.message }); }
    });

    r.post('/agent/stop', async (req, res) => {
      try {
        await this.agent.stop();
        this.broadcast('agent:stopped', {});
        res.json({ ok: true });
      } catch (e) { res.status(500).json({ error: e.message }); }
    });

    r.get('/agent/state', (req, res) => res.json(this.agent.getState()));

    // === Actions ===
    r.post('/action/go', async (req, res) => {
      try {
        const { x, y, z } = req.body;
        const result = await this.agent.go(x, y, z);
        this.broadcast('action:go', { x, y, z, result });
        res.json({ ok: true, result });
      } catch (e) { res.status(500).json({ error: e.message }); }
    });

    r.post('/action/mine', async (req, res) => {
      try {
        const { block, count } = req.body;
        const result = await this.agent.mine(block);
        this.broadcast('action:mine', { block, count, result });
        res.json({ ok: true, result });
      } catch (e) { res.status(500).json({ error: e.message }); }
    });

    r.post('/action/build', async (req, res) => {
      try {
        const { description } = req.body;
        const result = await this.agent.build(description);
        this.broadcast('action:build', { description, result });
        res.json({ ok: true, result });
      } catch (e) { res.status(500).json({ error: e.message }); }
    });

    r.post('/action/craft', async (req, res) => {
      try {
        const { item, count } = req.body;
        const result = await this.agent.executeCommand('api', `craft ${item} ${count || 1}`);
        this.broadcast('action:craft', { item, count, result });
        res.json({ ok: true, result });
      } catch (e) { res.status(500).json({ error: e.message }); }
    });

    r.post('/action/equip', async (req, res) => {
      try {
        const { item } = req.body;
        const result = await this.agent.executeCommand('api', `equip ${item}`);
        res.json({ ok: true, result });
      } catch (e) { res.status(500).json({ error: e.message }); }
    });

    r.post('/action/attack', async (req, res) => {
      try {
        const { target } = req.body;
        const result = await this.agent.executeCommand('api', `attack ${target || ''}`);
        res.json({ ok: true, result });
      } catch (e) { res.status(500).json({ error: e.message }); }
    });

    r.post('/action/chat', async (req, res) => {
      try {
        const { message } = req.body;
        this.agent.bot.chat(message);
        this.broadcast('action:chat', { message });
        res.json({ ok: true });
      } catch (e) { res.status(500).json({ error: e.message }); }
    });

    r.post('/action/cmd', async (req, res) => {
      try {
        const { command } = req.body;
        const result = await this.agent.executeCommand('api', command);
        res.json({ ok: true, result });
      } catch (e) { res.status(500).json({ error: e.message }); }
    });

    r.post('/action/execute', async (req, res) => {
      try {
        const { task, username } = req.body;
        const result = await this.agent.execute(task, username || 'api');
        this.broadcast('action:executed', { task, result });
        res.json({ ok: true, result });
      } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // === Game State ===
    r.get('/state/position', (req, res) => {
      const pos = this.agent.bot?.entity?.position;
      res.json(pos ? { x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) } : null);
    });

    r.get('/state/health', (req, res) => res.json({
      health: this.agent.bot?.health,
      food: this.agent.bot?.food,
    }));

    r.get('/state/inventory', (req, res) => {
      const items = this.agent.bot?.inventory?.items() || [];
      res.json(items.map(i => ({ name: i.name, count: i.count, slot: i.slot })));
    });

    r.get('/state/entities', (req, res) => {
      if (!this.agent.bot) return res.json([]);
      const entities = Object.values(this.agent.bot.entities)
        .filter(e => e !== this.agent.bot.entity)
        .slice(0, 50)
        .map(e => ({
          name: e.name || e.username,
          type: e.type,
          position: e.position ? { x: Math.round(e.position.x), y: Math.round(e.position.y), z: Math.round(e.position.z) } : null,
          distance: e.position?.distanceTo(this.agent.bot.entity.position),
        }));
      res.json(entities);
    });

    // === Skills ===
    r.get('/skills', (req, res) => res.json(this.agent.skills?.list() || []));
    r.post('/skills', (req, res) => {
      this.agent.skills?.save(req.body);
      res.json({ ok: true });
    });
    r.get('/skills/search', (req, res) => {
      const q = req.query.q || '';
      res.json(this.agent.skills?.searchSync(q) || []);
    });

    // === Memory ===
    r.get('/memory/search', (req, res) => {
      const q = req.query.q || '';
      res.json(this.agent.memory?.search(q) || []);
    });
    r.post('/memory/fact', (req, res) => {
      const { key, value } = req.body;
      this.agent.memory?.setFact(key, value);
      res.json({ ok: true });
    });
    r.get('/memory/fact/:key', (req, res) => {
      res.json({ value: this.agent.memory?.getFact(req.params.key) });
    });

    // === Server Management ===
    r.post('/server/setup', async (req, res) => {
      try {
        const { ServerSetup } = await import('../server/setup.js');
        const setup = new ServerSetup(req.body.dir || '/opt/mc-server');
        const result = await setup.installPaper(req.body.version, req.body.port);
        this.broadcast('server:installed', result);
        res.json({ ok: true, ...result });
      } catch (e) { res.status(500).json({ error: e.message }); }
    });

    r.post('/server/plugin', async (req, res) => {
      try {
        const { ServerSetup } = await import('../server/setup.js');
        const setup = new ServerSetup(req.body.dir || '/opt/mc-server');
        setup.installPlugin(req.body.dir || '/opt/mc-server', req.body.pluginPath);
        res.json({ ok: true });
      } catch (e) { res.status(500).json({ error: e.message }); }
    });

    r.get('/server/status', (req, res) => {
      try {
        const { ServerSetup } = require('../server/setup.js');
        const setup = new ServerSetup(req.body.dir || '/opt/mc-server');
        res.json(setup.getStatus(req.body.dir || '/opt/mc-server'));
      } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // === Webhooks ===
    r.post('/webhooks/register', (req, res) => {
      const { event, url, secret } = req.body;
      if (!this.webhooks.has(event)) this.webhooks.set(event, []);
      this.webhooks.get(event).push({ url, secret });
      res.json({ ok: true, event, total: this.webhooks.get(event).length });
    });

    r.delete('/webhooks/:event', (req, res) => {
      this.webhooks.delete(req.params.event);
      res.json({ ok: true });
    });

    // === Stats ===
    r.get('/stats', (req, res) => res.json(this.agent.stats));

    // === MCP (Model Context Protocol) ===
    r.post('/mcp/tools/list', (req, res) => {
      res.json({
        tools: [
          { name: 'minecraft_go', description: 'Move to coordinates', inputSchema: { type: 'object', properties: { x: {type:'number'}, y: {type:'number'}, z: {type:'number'} }, required: ['x','y','z'] }},
          { name: 'minecraft_mine', description: 'Mine a block', inputSchema: { type: 'object', properties: { block: {type:'string'}, count: {type:'number'} }, required: ['block'] }},
          { name: 'minecraft_build', description: 'Build from description', inputSchema: { type: 'object', properties: { description: {type:'string'} }, required: ['description'] }},
          { name: 'minecraft_chat', description: 'Send chat message', inputSchema: { type: 'object', properties: { message: {type:'string'} }, required: ['message'] }},
          { name: 'minecraft_execute', description: 'Execute natural language task', inputSchema: { type: 'object', properties: { task: {type:'string'} }, required: ['task'] }},
          { name: 'minecraft_command', description: 'Run server command', inputSchema: { type: 'object', properties: { command: {type:'string'} }, required: ['command'] }},
          { name: 'minecraft_state', description: 'Get bot state', inputSchema: { type: 'object', properties: {} }},
          { name: 'minecraft_inventory', description: 'Get inventory', inputSchema: { type: 'object', properties: {} }},
        ],
      });
    });

    r.post('/mcp/tools/call', async (req, res) => {
      const { name, arguments: args } = req.body;
      try {
        let result;
        switch (name) {
          case 'minecraft_go': result = await this.agent.go(args.x, args.y, args.z); break;
          case 'minecraft_mine': result = await this.agent.mine(args.block); break;
          case 'minecraft_build': result = await this.agent.build(args.description); break;
          case 'minecraft_chat': this.agent.bot.chat(args.message); result = `Said: ${args.message}`; break;
          case 'minecraft_execute': result = await this.agent.execute(args.task); break;
          case 'minecraft_command': result = await this.agent.executeCommand('mcp', args.command); break;
          case 'minecraft_state': result = JSON.stringify(this.agent.getState()); break;
          case 'minecraft_inventory': result = JSON.stringify(this.agent.bot?.inventory?.items()?.map(i => `${i.name}x${i.count}`) || []); break;
          default: result = `Unknown tool: ${name}`;
        }
        res.json({ content: [{ type: 'text', text: String(result) }] });
      } catch (e) { res.json({ content: [{ type: 'text', text: `Error: ${e.message}` }] }); }
    });
  }

  // === WebSocket ===
  setupWebSocket(server) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      log.info(`WebSocket client connected (${this.clients.size} total)`);

      ws.on('close', () => {
        this.clients.delete(ws);
        log.debug(`WebSocket client disconnected (${this.clients.size} total)`);
      });

      // Send initial state
      ws.send(JSON.stringify({ event: 'connected', data: this.agent.getState() }));
    });
  }

  broadcast(event, data) {
    const msg = JSON.stringify({ event, data, timestamp: Date.now() });
    for (const client of this.clients) {
      try { client.send(msg); } catch {}
    }
    // Fire webhooks
    this.fireWebhooks(event, data);
  }

  async fireWebhooks(event, data) {
    const hooks = this.webhooks.get(event) || [];
    for (const hook of hooks) {
      try {
        await fetch(hook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-MCWebhook-Secret': hook.secret || '' },
          body: JSON.stringify({ event, data, timestamp: Date.now() }),
        });
      } catch (e) {
        log.debug(`Webhook failed: ${hook.url} — ${e.message}`);
      }
    }
  }

  async start() {
    return new Promise((resolve) => {
      this.server = createServer(this.app);
      this.setupWebSocket(this.server);
      this.server.listen(this.port, () => {
        log.info(`API server: http://localhost:${this.port}`);
        log.info(`WebSocket: ws://localhost:${this.port}`);
        log.info(`MCP endpoint: http://localhost:${this.port}/mcp/tools/`);
        resolve();
      });
    });
  }

  async stop() {
    if (this.server) this.server.close();
  }
}
