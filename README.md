<div align="center">

# minecraft-use

**All-in-one AI agent for Minecraft — server setup, plugin testing, gameplay, building, mining, everything**

[![Version](https://img.shields.io/badge/version-0.0.1--beta.1-blue)](https://github.com/kyssta-exe/minecraft-use)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![Minecraft](https://img.shields.io/badge/minecraft-1.8--1.21+-orange)](https://minecraft.net)

*Like browser-use, but for Minecraft.*

</div>

---

## What is minecraft-use?

minecraft-use is an all-in-one AI agent that connects any LLM to any Minecraft server. Whether you need to **set up a server**, **test plugins**, **mine diamonds**, **build structures**, or **manage players** — one tool does it all.

### Server Setup & Management
```bash
# Install Paper + plugins from scratch
minecraft-use setup --version 1.21.4 --plugins /path/to/plugins/

# Check server status
minecraft-use status --dir /opt/mc-server
```

### Plugin Testing
```bash
# Run a test suite against your server
minecraft-use test --server localhost --port 25565 --suite lumora-tests.json

# Quick smoke test
minecraft-use test --server localhost --port 25565
```

### Gameplay & Building
```bash
# Connect and play
minecraft-use start --server localhost --port 25565

# In-game commands
!mine diamond_ore 5          # Mine blocks
!go 100 64 200               # Navigate
!build a wooden house        # AI-powered building
!craft iron_pickaxe          # Craft items
!attack zombie               # Combat

# Natural language
Player: minecraft-use strip mine for diamonds at Y=-59
Player: minecraft-use build a 20x20 spawn platform
Player: minecraft-use follow me and protect me
```

### Programmatic API
```javascript
import { createAgent, ServerSetup, PluginTester } from 'minecraft-use';

// Server setup
const setup = new ServerSetup('/opt/mc-server');
await setup.installPaper('1.21.4', 25565);
setup.installPlugins('/opt/mc-server', '/path/to/plugins/');
setup.startServer('/opt/mc-server');

// Connect agent
const agent = await createAgent({ server: { host: 'localhost', port: 25565 } });
await agent.start();

// Plugin testing
const tester = new PluginTester(agent);
const results = await tester.runSuite({
  name: 'Lumora Duels',
  tests: [
    { name: 'open menu', run: (bot) => bot.chat('/lumora'), wait: 2000 },
    { name: 'set spawn', run: (bot) => bot.chat('/lumora setspawn'), wait: 1000 },
    { name: 'check items', expect: (bot) => bot.inventory.items().length > 0 },
  ]
});
console.log(tester.generateReport('Lumora', results));

// Gameplay
await agent.mine('diamond_ore');
await agent.go(100, 64, 200);
await agent.build('a small wooden house with a door');
```

## Features

| Feature | Description |
|---------|-------------|
| **Server Setup** | Install Paper, configure, install plugins, start/stop |
| **Plugin Testing** | Automated test suites, command verification, state capture |
| **Mine** | Find and mine any block type |
| **Build** | AI-powered building from natural language |
| **Navigate** | Pathfinding to coordinates or players |
| **Craft** | Auto-crafting with recipe lookup |
| **Combat** | Attack mobs and players |
| **Inventory** | Manage items, equip, trade |
| **Chat** | Send messages, run commands |
| **MCP Server** | Claude Desktop / Hermes integration |
| **19 LLM Providers** | Claude, GPT, Gemini, Groq, Ollama, and more |
| **Token Efficient** | ~1,000 tokens/decision with confidence engine |
| **Persistent Memory** | Remembers across sessions |

## 19 LLM Providers

| Provider | Default Model | Env Variable |
|----------|---------------|-------------|
| Anthropic | claude-sonnet-4-20250514 | ANTHROPIC_API_KEY |
| OpenAI | gpt-4o | OPENAI_API_KEY |
| Google | gemini-2.0-flash | GEMINI_API_KEY |
| Groq | llama-3.3-70b-versatile | GROQCLOUD_API_KEY |
| Ollama | llama3.3:70b | OLLAMA_URL |
| DeepSeek | deepseek-chat | DEEPSEEK_API_KEY |
| Mistral | mistral-large-latest | MISTRAL_API_KEY |
| Qwen | qwen-plus | QWEN_API_KEY |
| xAI | grok-3 | XAI_API_KEY |
| LM Studio | local-model | LMSTUDIO_URL |
| vLLM | local-model | VLLM_URL |
| OpenRouter | anthropic/claude-sonnet-4 | OPENROUTER_API_KEY |
| Azure | gpt-4o | AZURE_ENDPOINT + AZURE_API_KEY |
| Cerebras | llama-3.3-70b | CEREBRAS_API_KEY |
| HuggingFace | meta-llama/Llama-3.3-70B-Instruct | HF_API_KEY |
| Replicate | meta/meta-llama-3.1-70b-instruct | REPLICATE_API_TOKEN |
| Mercury | mercury-coder | MERCURY_API_KEY |
| Novita | meta-llama/llama-3.1-70b-instruct | NOVITA_API_KEY |
| Hyperbolic | meta-llama/Meta-Llama-3.1-70B-Instruct | HYPERBOLIC_API_KEY |

## Quick Start

```bash
npm install minecraft-use
cp .env.example .env   # Add your API key
minecraft-use start     # Connect to server
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `minecraft-use start` | Start agent and connect to server |
| `minecraft-use setup` | Install and configure a new server |
| `minecraft-use test` | Run plugin tests |
| `minecraft-use status` | Check server status |
| `minecraft-use mcp` | Start MCP server for Claude Desktop |

## Configuration

```yaml
# config.yaml
server:
  host: localhost
  port: 25565
  username: minecraft-use-bot

llm:
  provider: anthropic
  model: claude-sonnet-4-20250514

agent:
  prefix: "!"
  context_budget: 4096
  confidence_threshold: 0.85
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  LAYER 4: Interface              │
│  CLI │ MCP Server │ Game Chat │ API             │
├─────────────────────────────────────────────────┤
│                  LAYER 3: Agent Core             │
│  ContextBuilder │ ConfidenceEngine │ Skills      │
├─────────────────────────────────────────────────┤
│                  LAYER 2: Observation            │
│  StateManager │ DiffEngine │ Memory             │
├─────────────────────────────────────────────────┤
│                  LAYER 1: Connection             │
│  Mineflayer Bot │ Server Setup │ Plugin Tester   │
└─────────────────────────────────────────────────┘
```

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

**Built by [Kyssta](https://github.com/kyssta-exe)**

</div>
