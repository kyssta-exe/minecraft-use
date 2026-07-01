# Skills

Skills are reusable action patterns stored in SQLite with full-text search.

## How Skills Work

1. **Storage** — Skills saved in SQLite with FTS5 index
2. **Retrieval** — When a task comes in, relevant skills are found by text similarity
3. **Reuse** — If a skill matches, it's included in the LLM context
4. **Learning** — Successful skill executions are tracked

## Built-in Skills

| Skill | Description |
|-------|-------------|
| `mine_block` | Mine a specific block type |
| `go_to` | Move to coordinates or player |
| `craft_item` | Craft an item |
| `build_structure` | Build from description |
| `attack_mob` | Attack hostile mobs |

## Custom Skills

```javascript
// Save a skill
agent.skills.save({
  name: 'strip_mine_diamonds',
  description: 'Strip mine at Y=-59 for diamonds',
  code: 'go to Y=-59, dig forward 100 blocks, collect diamond_ore',
  params: JSON.stringify({ depth: 59 }),
});

// Search skills
const skills = agent.skills.searchSync('diamond mining', 3);
```

## Skill Library API

```javascript
// Get a skill by name
const skill = agent.skills.get('mine_block');

// List all skills
const all = agent.skills.list();

// Record success/failure
agent.skills.recordSuccess('mine_block');
agent.skills.recordFailure('mine_block');
```
