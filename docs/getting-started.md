# Getting Started

## Installation

```bash
npm install minecraft-use
```

Or clone and build from source:

```bash
git clone https://github.com/kyssta-exe/minecraft-use.git
cd minecraft-use
npm install
```

## Quick Setup

1. **Configure your LLM provider:**

```bash
cp .env.example .env
```

Edit `.env` and set your API key:

```env
ANTHROPIC_API_KEY=sk-ant-...
MODEL_PROVIDER=anthropic
MODEL_NAME=claude-sonnet-4-20250514
```

2. **Configure your Minecraft server:**

```env
MC_HOST=localhost
MC_PORT=25565
MC_USERNAME=minecraft-use-bot
MC_AUTH=offline
```

3. **Start the agent:**

```bash
npx minecraft-use start
```

## First Commands

Once connected, open Minecraft and type in chat:

```
!help                    # List all commands
!mine diamond_ore 3      # Mine 3 diamond ore
!go 100 64 200           # Move to coordinates
!inv                     # Show inventory
```

Or just mention the bot:

```
Player: Hey minecraft-use, can you find me some iron?
```

## Programmatic Usage

```javascript
import { createAgent } from 'minecraft-use';

const agent = await createAgent({
  server: { host: 'localhost', port: 25565 },
  llm: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
});

await agent.start();

// Direct actions
await agent.mine('diamond_ore');
await agent.go(100, 64, 200);

// Natural language
await agent.build('a small wooden house with a door and windows');

await agent.stop();
```

## Running as MCP Server

For Claude Desktop or Hermes integration:

```bash
npx minecraft-use mcp --port 8088
```

Then configure your MCP client to connect to `http://localhost:8088`.
