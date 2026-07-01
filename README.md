<div align="center">

# minecraft-use

**AI agent for Minecraft — connect any LLM to any server**

[![Version](https://img.shields.io/badge/version-0.0.1--beta.1-blue)](https://github.com/kyssta-exe/minecraft-use)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![Minecraft](https://img.shields.io/badge/minecraft-1.8--1.21+-orange)](https://minecraft.net)

*Like browser-use, but for Minecraft.*

</div>

---

## What is minecraft-use?

minecraft-use is a token-efficient AI agent that connects any LLM (Claude, GPT, Ollama, etc.) to any Minecraft server. Control the bot via **game chat**, **MCP protocol**, or **programmatic API**.

### Key Features

- **Token-efficient** — State diffing, skill library, confidence engine. ~1,000 tokens per decision vs Mindcraft's ~4,000-8,000
- **Multi-LLM** — Claude, GPT-4o, Ollama, or any OpenAI-compatible API
- **Game chat control** — `!mine diamond_ore 3` or "Hey bot, build me a house"
- **MCP server** — Works with Claude Desktop, Hermes, and any MCP client
- **Skill library** — SQLite-backed with FTS5 search. Learns from successes
- **Confidence engine** — Skips LLM entirely for known patterns
- **Persistent memory** — Episodic + semantic memory across sessions
- **Plugin testing** — Automated testing of Paper/Spigot plugins
- **Server setup** — Automate server configuration and plugin management

## Quick Start

```bash
# Install
npm install minecraft-use

# Configure
cp .env.example .env
# Edit .env with your API key and server details

# Run
npx minecraft-use start
```

Or with a config file:

```bash
npx minecraft-use start --config config.yaml
```

## Usage

### Game Chat Commands

The bot responds to commands prefixed with `!` (configurable):

```
!mine diamond_ore 3      # Mine 3 diamond ore
!go 100 64 200           # Move to coordinates
!goto Steve              # Go to a player
!equip iron_sword        # Equip an item
!attack zombie           # Attack a mob
!craft iron_pickaxe      # Craft an item
!inv                     # Show inventory
!health                  # Show health/food
!cmd gamemode creative   # Run server command
!help                    # List all commands
```

### Natural Language

Just mention the bot's name:

```
Player: Hey minecraft-use, can you find me some iron ore?
Player: minecraft-use build a small house nearby
Player: minecraft-use follow me
```

### MCP Integration

```bash
# Start as MCP server
npx minecraft-use mcp --port 8088
```

Configure in Claude Desktop or Hermes:

```json
{
  "mcpServers": {
    "minecraft": {
      "url": "http://localhost:8088"
    }
  }
}
```

### Programmatic API

```javascript
import { createAgent } from 'minecraft-use';

const agent = await createAgent({
  server: { host: 'localhost', port: 25565 },
  llm: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
});

await agent.start();
await agent.mine('diamond_ore');
await agent.go(100, 64, 200);
await agent.build('a 5x5 cobblestone platform');
await agent.stop();
```

## Configuration

### config.yaml

```yaml
server:
  host: localhost
  port: 25565
  username: minecraft-use-bot
  version: "1.21.4"
  auth: offline

llm:
  provider: anthropic
  model: claude-sonnet-4-20250514

agent:
  prefix: "!"
  context_budget: 4096
  confidence_threshold: 0.85
  auto_reconnect: true
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MC_HOST` | localhost | Minecraft server host |
| `MC_PORT` | 25565 | Minecraft server port |
| `MC_USERNAME` | minecraft-use-bot | Bot username |
| `ANTHROPIC_API_KEY` | — | Anthropic API key |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `OLLAMA_URL` | http://localhost:11434 | Ollama server URL |
| `MODEL_PROVIDER` | anthropic | LLM provider |
| `MODEL_NAME` | claude-sonnet-4-20250514 | Model name |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  LAYER 4: Interface              │
│  CLI │ MCP Server │ Game Chat │ Programmatic     │
├─────────────────────────────────────────────────┤
│                  LAYER 3: Agent Core             │
│  ContextBuilder │ ConfidenceEngine │ Skills      │
├─────────────────────────────────────────────────┤
│                  LAYER 2: Observation            │
│  StateManager │ DiffEngine │ Memory             │
├─────────────────────────────────────────────────┤
│                  LAYER 1: Connection             │
│  Mineflayer Bot │ Paper Plugin (planned)         │
└─────────────────────────────────────────────────┘
```

## Token Efficiency

| Component | minecraft-use | Mindcraft |
|-----------|--------------|-----------|
| System prompt | ~150 tokens | ~1,200 tokens |
| State | ~60 tokens (diff) | ~300 tokens (full) |
| Decision cycle | **~1,000 tokens** | ~4,000-8,000 tokens |
| Confidence bypass | 0 tokens | N/A |
| **Hourly (3 bots)** | **~3M tokens** | **~10M tokens** |

## Skills

Skills are reusable action patterns stored in SQLite with FTS5 full-text search:

```javascript
// Save a custom skill
agent.skills.save({
  name: 'strip_mine',
  description: 'Strip mine at Y=-59 for diamonds',
  code: 'go 100 -59 100, mine diamond_ore 5',
});
```

The confidence engine learns from successful actions and replays them without LLM calls.

## Roadmap

- [ ] Paper plugin bridge (server-side actions)
- [ ] Multi-agent coordination
- [ ] Vision module (screenshot analysis)
- [ ] Plugin testing framework
- [ ] Server setup automation
- [ ] Hermes skill integration
- [ ] Dashboard web UI
- [ ] Training data collection

## Contributing

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Push and open a PR

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

**Built by [Kyssta](https://github.com/kyssta-exe)**

</div>
