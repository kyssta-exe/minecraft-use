# Actions

minecraft-use supports both direct actions (instant, no LLM) and natural language tasks (LLM-powered).

## Direct Actions

These execute immediately without LLM calls:

| Command | Description | Example |
|---------|-------------|---------|
| `go <x> <y> <z>` | Move to coordinates | `!go 100 64 200` |
| `goto <player>` | Go to a player | `!goto Steve` |
| `mine <block> [count]` | Mine a block type | `!mine diamond_ore 3` |
| `equip <item>` | Equip an item | `!equip iron_sword` |
| `drop <item> [count]` | Drop items | `!drop cobblestone 10` |
| `inv` | Show inventory | `!inv` |
| `health` | Show health/food | `!health` |
| `attack [type]` | Attack nearby mob | `!attack zombie` |
| `place` | Place held block | `!place` |
| `cmd <command>` | Run server command | `!cmd gamemode creative` |
| `say <message>` | Send chat message | `!say Hello!` |
| `pos` | Show position | `!pos` |
| `help` | List all actions | `!help` |

## Natural Language Tasks

Mention the bot name for LLM-powered tasks:

```
Player: minecraft-use build a house nearby
Player: minecraft-use find iron and bring it to me
Player: minecraft-use set up a wheat farm
```

## JSON Actions (LLM Output)

The LLM can output structured JSON actions:

```json
{"action": "move", "x": 100, "y": 64, "z": 200}
{"action": "mine", "block": "diamond_ore", "count": 3}
{"action": "craft", "item": "iron_pickaxe"}
{"action": "equip", "item": "iron_sword"}
{"action": "attack", "target": "zombie"}
{"action": "give", "player": "Steve", "item": "diamond", "count": 1}
{"action": "chat", "message": "Hello!"}
{"action": "cmd", "command": "gamemode creative"}
```

## Custom Actions

Register custom actions via the API:

```javascript
agent.actions.register('farm', 'Auto-farm wheat', async (bot, args) => {
  // Your farming logic here
  return 'Farming complete!';
});
```
