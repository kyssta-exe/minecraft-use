---
name: minecraft-use
description: AI agent for Minecraft — connect any LLM to any Minecraft server via game chat, MCP, or programmatic API
version: 0.0.1-beta.1
category: minecraft
tags: [minecraft, ai, llm, agent, bot, mineflayer, mcp]
---

# minecraft-use

AI agent for Minecraft — connect any LLM to any Minecraft server.

## When to use

- Controlling a Minecraft bot via game chat or programmatic API
- Automating Minecraft tasks (mining, building, crafting)
- Testing Minecraft plugins automatically
- Setting up and managing Minecraft servers
- Connecting Claude Desktop / Hermes to Minecraft

## Installation

```bash
cd /root/projects/minecraft-use && npm install
```

## Quick Start

```bash
# Start the agent
cd /root/projects/minecraft-use
node src/cli.js start --config config.yaml

# Or as MCP server
node src/cli.js mcp --port 8088
```

## Game Chat Commands

Prefix: `!` (configurable in config.yaml)

| Command | Description |
|---------|-------------|
| `!mine <block> [count]` | Mine a block type |
| `!go <x> <y> <z>` | Move to coordinates |
| `!goto <player>` | Go to a player |
| `!equip <item>` | Equip an item |
| `!attack [type]` | Attack a mob |
| `!craft <item>` | Craft an item |
| `!inv` | Show inventory |
| `!health` | Show health/food |
| `!cmd <command>` | Run server command |
| `!help` | List all actions |

## Natural Language

Mention the bot name in chat:
```
Player: minecraft-use build me a house
Player: minecraft-use find iron ore
```

## Programmatic API

```javascript
import { createAgent } from './src/index.js';

const agent = await createAgent({
  server: { host: 'localhost', port: 25565 },
  llm: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
});

await agent.start();
await agent.mine('diamond_ore');
await agent.go(100, 64, 200);
await agent.stop();
```

## MCP Server

Start the MCP server for Claude Desktop / Hermes integration:

```bash
node src/cli.js mcp --port 8088
```

Available MCP tools:
- `minecraft_move` — Move to coordinates
- `minecraft_mine` — Mine a block
- `minecraft_chat` — Send chat message
- `minecraft_execute` — Natural language task
- `minecraft_command` — Run server command
- `minecraft_state` — Get bot state

## Configuration

Edit `config.yaml` or set environment variables. See docs/configuration.md for full reference.

Key settings:
- `server.host` — Minecraft server address
- `llm.provider` — anthropic, openai, or ollama
- `agent.prefix` — Chat command prefix (default: `!`)
- `agent.context_budget` — Token budget per decision (default: 4096)
