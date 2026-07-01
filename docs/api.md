# API Reference

## createAgent(options)

Creates a new minecraft-use agent.

```javascript
import { createAgent } from 'minecraft-use';

const agent = await createAgent({
  config: 'config.yaml',  // optional
  server: {
    host: 'localhost',
    port: 25565,
    username: 'bot',
    auth: 'offline',
  },
  llm: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
  },
});
```

## Agent Methods

### agent.start()
Connect to the Minecraft server and start the agent.

### agent.stop()
Disconnect and clean up resources.

### agent.execute(task, username?)
Process a natural language task via LLM.

### agent.executeCommand(username, raw)
Execute a direct command (without prefix).

### agent.go(x, y, z)
Move to coordinates.

### agent.mine(block)
Mine a block type.

### agent.build(description)
Build a structure from natural language.

### agent.say(message)
Send a chat message.

### agent.getState()
Get current bot state (position, health, inventory, stats).

## Events

| Event | Data | Description |
|-------|------|-------------|
| `ready` | — | Bot connected and ready |
| `danger` | `{health, food}` | Health below threshold |
| `kicked` | `reason` | Bot was kicked |

## SkillLibrary

### agent.skills.save(skill)
Save a skill to the library.

### agent.skills.get(name)
Get a skill by name.

### agent.skills.searchSync(query, limit?)
Search skills by text similarity.

### agent.skills.list()
List all skills.

### agent.skills.recordSuccess(name)
Record a successful skill execution.

### agent.skills.recordFailure(name)
Record a failed skill execution.

## Memory

### agent.memory.addTurn(role, speaker, content)
Add a conversation turn.

### agent.memory.getRecent(count?)
Get recent conversation turns.

### agent.memory.getSummary()
Get compressed memory summary.

### agent.memory.setFact(key, value)
Store a persistent fact.

### agent.memory.getFact(key)
Retrieve a persistent fact.

### agent.memory.search(query, limit?)
Search episodes by content.
