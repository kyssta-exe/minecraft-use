/**
 * ContextBuilder — Token-efficient prompt assembly
 *
 * Assembles the LLM context dynamically based on token budget.
 * Only includes what's relevant to the current task.
 * Inspired by mindcraft-mcgavin's ContextBuilder.
 */

const SYSTEM_PROMPT_BASE = `You are an AI agent controlling a Minecraft bot. You respond with actions in JSON or chat messages.

Actions (JSON format):
{"action": "move", "x": 100, "y": 64, "z": 200}
{"action": "mine", "block": "diamond_ore", "count": 3}
{"action": "place", "block": "cobblestone", "x": 100, "y": 64, "z": 200}
{"action": "craft", "item": "iron_pickaxe", "count": 1}
{"action": "equip", "item": "iron_sword"}
{"action": "attack", "target": "zombie"}
{"action": "give", "player": "Steve", "item": "diamond", "count": 1}
{"action": "chat", "message": "Hello!"}
{"action": "cmd", "command": "gamemode creative"}

For simple responses, just reply as chat text (under 100 chars).
Be concise. Prioritize survival if health is low.`;

export class ContextBuilder {
  constructor(config) {
    this.budget = config.agent?.context_budget || 4096;
    this.maxHistory = config.agent?.max_history || 15;
  }

  /**
   * Build the complete LLM context within token budget.
   * Returns { systemPrompt, messages } for the LLM call.
   */
  build(bot, memory, skills, task) {
    const sections = [];
    let tokenEstimate = 0;

    // 1. Base system prompt (always included, ~150 tokens)
    sections.push(SYSTEM_PROMPT_BASE);
    tokenEstimate += 150;

    // 2. Bot state (compact, ~50-100 tokens)
    const state = this.buildStateSummary(bot);
    sections.push(`Bot: ${state}`);
    tokenEstimate += 60;

    // 3. Inventory (only if relevant, ~30-80 tokens)
    const inventory = this.buildInventorySummary(bot);
    if (inventory) {
      sections.push(`Inventory: ${inventory}`);
      tokenEstimate += 50;
    }

    // 4. Nearby entities (if relevant, ~30-50 tokens)
    const entities = this.buildEntitySummary(bot);
    if (entities) {
      sections.push(`Nearby: ${entities}`);
      tokenEstimate += 40;
    }

    // 5. Relevant skills (if any match, ~50-100 tokens)
    if (skills) {
      const relevantSkills = skills.searchSync(task, 3);
      if (relevantSkills.length > 0) {
        const skillDescs = relevantSkills.map(s => `${s.name}: ${s.description}`).join('; ');
        sections.push(`Known skills: ${skillDescs}`);
        tokenEstimate += 80;
      }
    }

    // 6. Recent memory (compressed, ~50-100 tokens)
    const memSummary = memory?.getSummary();
    if (memSummary) {
      sections.push(`Context: ${memSummary}`);
      tokenEstimate += 70;
    }

    const systemPrompt = sections.join('\n\n');

    // 7. Build messages array (recent conversation history)
    const messages = this.buildMessages(memory, task);

    return { systemPrompt, messages };
  }

  buildStateSummary(bot) {
    if (!bot?.entity) return 'Connecting...';
    const pos = bot.entity.position;
    const dim = bot.game?.dimension || 'unknown';
    const time = bot.time?.isDay ? 'day' : 'night';
    return `${Math.round(pos.x)},${Math.round(pos.y)},${Math.round(pos.z)} | HP:${Math.round(bot.health)} Food:${Math.round(bot.food)} | ${dim} ${time}`;
  }

  buildInventorySummary(bot) {
    if (!bot?.inventory) return null;
    const items = bot.inventory.items();
    if (items.length === 0) return 'empty';

    // Group by name, count totals
    const counts = {};
    for (const item of items) {
      counts[item.name] = (counts[item.name] || 0) + item.count;
    }

    // Top 10 most common items
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => `${name}x${count}`);

    return sorted.join(', ') + (Object.keys(counts).length > 10 ? ` +${Object.keys(counts).length - 10} more` : '');
  }

  buildEntitySummary(bot) {
    if (!bot?.entities) return null;
    const nearby = Object.values(bot.entities)
      .filter(e => e !== bot.entity && e.position?.distanceTo(bot.entity.position) < 16)
      .slice(0, 8);

    if (nearby.length === 0) return null;

    return nearby.map(e => {
      const name = e.name || e.username || e.entityType || 'unknown';
      const dist = Math.round(e.position.distanceTo(bot.entity.position));
      return `${name}(${dist}m)`;
    }).join(', ');
  }

  buildMessages(memory, task) {
    const messages = [];

    // Add recent conversation context
    const recent = memory?.getRecent(this.maxHistory) || [];
    for (const turn of recent) {
      messages.push({
        role: turn.role === 'assistant' ? 'assistant' : 'user',
        content: turn.content,
      });
    }

    // Add current task
    messages.push({ role: 'user', content: task });

    return messages;
  }
}
