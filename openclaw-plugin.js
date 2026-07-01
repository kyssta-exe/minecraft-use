/**
 * OpenClaw Plugin — minecraft-use
 *
 * Install: Copy this file to OpenClaw's plugins directory
 * Config: Set MINECRAFT_USE_URL=http://localhost:8088 in .env
 *
 * Provides 7 tools for controlling a Minecraft server via minecraft-use API.
 */

export const name = 'minecraft-use';
export const description = 'AI agent for Minecraft — mine, build, navigate, craft, server management';
export const version = '0.0.1-beta.1';

const API_BASE = process.env.MINECRAFT_USE_URL || 'http://localhost:8088';

async function api(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${endpoint}`, opts);
  return res.json();
}

export const tools = [
  {
    name: 'minecraft_mine',
    description: 'Mine a specific block type in Minecraft (e.g., diamond_ore, iron_ore, oak_log)',
    parameters: {
      type: 'object',
      properties: {
        block: { type: 'string', description: 'Block name' },
        count: { type: 'number', description: 'How many', default: 1 },
      },
      required: ['block'],
    },
    execute: async ({ block, count }) => {
      const r = await api('/action/mine', 'POST', { block, count });
      return r.ok ? r.result : `Error: ${r.error}`;
    },
  },
  {
    name: 'minecraft_build',
    description: 'Build a structure from natural language (e.g., "a 10x10 cobblestone platform", "a wooden house with a door")',
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'What to build' },
      },
      required: ['description'],
    },
    execute: async ({ description }) => {
      const r = await api('/action/build', 'POST', { description });
      return r.ok ? r.result : `Error: ${r.error}`;
    },
  },
  {
    name: 'minecraft_go',
    description: 'Move the bot to specific coordinates',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        z: { type: 'number' },
      },
      required: ['x', 'y', 'z'],
    },
    execute: async ({ x, y, z }) => {
      const r = await api('/action/go', 'POST', { x, y, z });
      return r.ok ? r.result : `Error: ${r.error}`;
    },
  },
  {
    name: 'minecraft_execute',
    description: 'Execute any natural language task (find diamonds, protect me, set up farm, etc.)',
    parameters: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'What to do in natural language' },
      },
      required: ['task'],
    },
    execute: async ({ task }) => {
      const r = await api('/action/execute', 'POST', { task });
      return r.ok ? r.result : `Error: ${r.error}`;
    },
  },
  {
    name: 'minecraft_command',
    description: 'Run a Minecraft server command (without the / prefix)',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command (e.g., "gamemode creative @a")' },
      },
      required: ['command'],
    },
    execute: async ({ command }) => {
      const r = await api('/action/cmd', 'POST', { command });
      return r.ok ? r.result : `Error: ${r.error}`;
    },
  },
  {
    name: 'minecraft_state',
    description: 'Get current bot state: position, health, food, inventory',
    parameters: { type: 'object', properties: {} },
    execute: async () => {
      const [pos, health, inv] = await Promise.all([
        api('/state/position'),
        api('/state/health'),
        api('/state/inventory'),
      ]);
      return JSON.stringify({ position: pos, health, inventory: inv }, null, 2);
    },
  },
  {
    name: 'minecraft_chat',
    description: 'Send a chat message in Minecraft',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message to send' },
      },
      required: ['message'],
    },
    execute: async ({ message }) => {
      const r = await api('/action/chat', 'POST', { message });
      return r.ok ? `Said: ${message}` : `Error: ${r.error}`;
    },
  },
];

export const onActivate = async () => {
  console.log(`[minecraft-use] Connecting to ${API_BASE}...`);
  try {
    const r = await api('/health');
    console.log(`[minecraft-use] Connected! Status: ${r.status}`);
  } catch {
    console.warn(`[minecraft-use] Warning: Cannot reach ${API_BASE}. Start minecraft-use first.`);
  }
};
