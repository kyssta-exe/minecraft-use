---
name: minecraft-use
description: All-in-one AI agent for Minecraft — server setup, plugin testing, gameplay, building, mining. Control via API, game chat, or MCP.
version: 0.0.1-beta.1
category: minecraft
tags: [minecraft, ai, llm, agent, bot, mineflayer, mcp, server, plugin-testing, api]
---

# minecraft-use

All-in-one AI agent for Minecraft. Server setup, plugin testing, gameplay, building, mining — everything.

## Quick Start

```bash
cd /root/projects/minecraft-use
npm install
cp .env.example .env  # Set ANTHROPIC_API_KEY + MC_HOST
node src/cli.js start --server localhost --port 25565
```

## API Base: http://localhost:8088

### Mine blocks
```bash
curl -X POST http://localhost:8088/action/mine -d '{"block":"diamond_ore","count":3}'
```

### Build from description
```bash
curl -X POST http://localhost:8088/action/build -d '{"description":"a 10x10 cobblestone platform"}'
```

### Natural language task
```bash
curl -X POST http://localhost:8088/action/execute -d '{"task":"find iron and bring it to spawn"}'
```

### Server command
```bash
curl -X POST http://localhost:8088/action/cmd -d '{"command":"gamemode creative @a"}'
```

### Get game state
```bash
curl http://localhost:8088/state/position
curl http://localhost:8088/state/health
curl http://localhost:8088/state/inventory
curl http://localhost:8088/state/entities
```

### Server setup
```bash
curl -X POST http://localhost:8088/server/setup -d '{"version":"1.21.4","port":25565}'
```

### Plugin testing
```bash
# Quick test
curl -X POST http://localhost:8088/action/cmd -d '{"command":"help"}'
```

### Memory
```bash
curl -X POST http://localhost:8088/memory/fact -d '{"key":"base","value":"100,64,200"}'
curl http://localhost:8088/memory/fact/base
```

## Game Chat

When bot is connected, use in-game chat:
- `!mine diamond_ore 3` — Mine blocks
- `!go 100 64 200` — Move to coords
- `!goto Steve` — Go to player
- `!equip iron_sword` — Equip item
- `!attack zombie` — Attack mob
- `!craft iron_pickaxe` — Craft item
- `!build a house` — AI building
- `!cmd gamemode creative` — Server command
- `!inv` — Show inventory
- `!health` — Show health
- `!help` — List all actions

## MCP (Claude Desktop)

```json
{"mcpServers":{"minecraft":{"url":"http://localhost:8088"}}}
```

Tools: `minecraft_go`, `minecraft_mine`, `minecraft_build`, `minecraft_chat`, `minecraft_execute`, `minecraft_command`, `minecraft_state`, `minecraft_inventory`

## WebSocket

Connect to `ws://localhost:8088` for real-time events.

## Full docs

https://github.com/kyssta-exe/minecraft-use
