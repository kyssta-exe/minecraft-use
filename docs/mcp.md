# MCP Integration

minecraft-use includes a Model Context Protocol (MCP) server for integration with Claude Desktop, Hermes, and other MCP clients.

## Starting the MCP Server

```bash
npx minecraft-use mcp --port 8088
```

Or via config:

```yaml
mcp:
  enabled: true
  port: 8088
```

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `minecraft_move` | Move to coordinates | `x`, `y`, `z` |
| `minecraft_mine` | Mine a block | `block`, `count?` |
| `minecraft_chat` | Send chat message | `message` |
| `minecraft_execute` | Natural language task | `task` |
| `minecraft_command` | Run server command | `command` |
| `minecraft_state` | Get bot state | — |

## Claude Desktop Configuration

```json
{
  "mcpServers": {
    "minecraft": {
      "url": "http://localhost:8088"
    }
  }
}
```

## Hermes Configuration

Add to your Hermes config:

```yaml
mcp:
  servers:
    minecraft:
      url: http://localhost:8088
```

## Connecting an Agent

```bash
# Connect the agent to a server first
curl -X POST http://localhost:8088/agent/connect \
  -H "Content-Type: application/json" \
  -d '{"config": "config.yaml"}'

# Then use MCP tools
curl -X POST http://localhost:8088/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "minecraft_mine", "arguments": {"block": "diamond_ore"}}'
```

## HTTP API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/tools/list` | POST | List available tools |
| `/tools/call` | POST | Execute a tool |
| `/agent/connect` | POST | Connect to MC server |
