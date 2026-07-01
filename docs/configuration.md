# Configuration

minecraft-use can be configured via `config.yaml`, `.env` file, or command-line arguments.

## Config File

```yaml
server:
  host: localhost
  port: 25565
  username: minecraft-use-bot
  version: "1.21.4"
  auth: offline  # offline or microsoft

llm:
  provider: anthropic  # anthropic, openai, ollama
  model: claude-sonnet-4-20250514

agent:
  prefix: "!"
  max_history: 20
  context_budget: 4096
  confidence_threshold: 0.85
  auto_reconnect: true
  vision_enabled: false

skills:
  db_path: ./data/skills.db
  auto_save: true

memory:
  db_path: ./data/memory.db
  max_short_term: 50
  summarize_threshold: 20

mcp:
  enabled: false
  port: 8088
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MC_HOST` | Server host | localhost |
| `MC_PORT` | Server port | 25565 |
| `MC_USERNAME` | Bot username | minecraft-use-bot |
| `MC_VERSION` | MC version | false (auto) |
| `MC_AUTH` | Auth type | offline |
| `ANTHROPIC_API_KEY` | Anthropic key | — |
| `OPENAI_API_KEY` | OpenAI key | — |
| `OLLAMA_URL` | Ollama URL | http://localhost:11434 |
| `MODEL_PROVIDER` | LLM provider | anthropic |
| `MODEL_NAME` | Model name | claude-sonnet-4-20250514 |
| `MCU_PREFIX` | Chat prefix | ! |
| `MCU_LOG_LEVEL` | Log level | info |
| `MCU_SKILLS_DB` | Skills DB path | ./data/skills.db |
| `MCU_MEMORY_DB` | Memory DB path | ./data/memory.db |

## LLM Providers

### Anthropic (Claude)

```yaml
llm:
  provider: anthropic
  model: claude-sonnet-4-20250514
```

Requires `@anthropic-ai/sdk` (optional dependency).

### OpenAI (GPT)

```yaml
llm:
  provider: openai
  model: gpt-4o
```

Requires `openai` (optional dependency).

### Ollama (Local)

```yaml
llm:
  provider: ollama
  model: llama3.3:70b
```

No extra packages needed. Requires running Ollama instance.

## Server Authentication

### Offline (Cracked)

```yaml
server:
  auth: offline
```

### Microsoft (Premium)

```yaml
server:
  auth: microsoft
```

Requires a valid Microsoft account. The bot will authenticate via browser.
