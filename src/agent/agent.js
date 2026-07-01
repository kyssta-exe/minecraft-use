/**
 * MinecraftUse — Core agent class
 *
 * Orchestrates connection, observation, decision, and action.
 * Token-efficient by design.
 */

import { EventEmitter } from 'events';
import { createConnection } from '../connection/mineflayer.js';
import { createLLM } from '../llm/index.js';
import { ContextBuilder } from './context.js';
import { ConfidenceEngine } from './confidence.js';
import { SkillLibrary } from '../skills/library.js';
import { Memory } from './memory.js';
import { ActionRegistry } from './actions.js';
import { ChatHandler } from '../chat/commands.js';
import { log } from '../utils/logger.js';

export class MinecraftUse extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.bot = null;
    this.llm = null;
    this.context = new ContextBuilder(config);
    this.confidence = new ConfidenceEngine();
    this.skills = null;
    this.memory = null;
    this.actions = new ActionRegistry();
    this.chat = null;
    this.running = false;
    this.stats = { decisions: 0, tokens: 0, llmCalls: 0, confidenceHits: 0 };
  }

  async start() {
    log.info('Starting minecraft-use agent...');

    // Initialize components
    this.llm = createLLM(this.config.llm);
    this.skills = new SkillLibrary(this.config.skills?.db_path || './data/skills.db');
    this.memory = new Memory(this.config.memory?.db_path || './data/memory.db');
    this.chat = new ChatHandler(this);

    await this.skills.init();
    await this.memory.init();
    this.actions.registerDefaults(this);

    // Connect to Minecraft
    this.bot = await createConnection(this.config.server);
    this.setupListeners();
    this.running = true;

    log.info(`Connected to ${this.config.server.host}:${this.config.server.port}`);
    log.info(`Bot: ${this.bot.username} | LLM: ${this.config.llm.provider}/${this.config.llm.model}`);
    this.emit('ready');
  }

  setupListeners() {
    const prefix = this.config.agent?.prefix || '!';

    // Chat messages → agent commands
    this.bot.on('chat', (username, message) => {
      if (username === this.bot.username) return;
      this.handleChat(username, message, prefix);
    });

    // Death/respawn handling
    this.bot.on('death', () => {
      log.warn('Bot died, respawning...');
      this.bot.emit('respawn');
    });

    // Health monitoring
    this.bot.on('health', () => {
      if (this.bot.health < 6) {
        this.emit('danger', { health: this.bot.health, food: this.bot.food });
      }
    });

    // Disconnect handling
    this.bot.on('kicked', (reason) => {
      log.error(`Kicked: ${reason}`);
      this.emit('kicked', reason);
      if (this.config.agent?.auto_reconnect) this.reconnect();
    });

    this.bot.on('error', (err) => {
      log.error(`Bot error: ${err.message}`);
    });
  }

  async handleChat(username, message, prefix) {
    // Log conversation
    this.memory.addTurn('user', username, message);

    if (message.startsWith(prefix)) {
      // Direct command: !mine iron_ore, !go 100 64 200, etc.
      const result = await this.executeCommand(username, message.slice(prefix.length).trim());
      this.bot.chat(result);
    } else if (message.includes(this.bot.username.toLowerCase())) {
      // Mentioned — process as natural language task
      const result = await this.execute(message, username);
      this.bot.chat(result);
    }
  }

  async executeCommand(username, raw) {
    const parts = raw.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Check built-in actions first
    const action = this.actions.get(cmd);
    if (action) {
      try {
        const result = await action.execute(this.bot, args, { username });
        return result;
      } catch (err) {
        log.error(`Action ${cmd} failed: ${err.message}`);
        return `§cError: ${err.message}`;
      }
    }

    // Fall through to LLM for natural language
    return this.execute(raw, username);
  }

  /**
   * Main decision loop — process a natural language task via LLM.
   * This is where token efficiency matters most.
   */
  async execute(task, username = 'system') {
    const startTime = Date.now();
    this.stats.decisions++;

    // 1. Build token-efficient context
    const context = this.context.build(this.bot, this.memory, this.skills, task);

    // 2. Check confidence engine — can we skip the LLM?
    const cached = this.confidence.lookup(task, this.bot);
    if (cached) {
      this.stats.confidenceHits++;
      log.debug(`Confidence hit for: ${task}`);
      return cached;
    }

    // 3. Call LLM
    try {
      const response = await this.llm.chat(context.messages, context.systemPrompt);
      this.stats.llmCalls++;
      this.stats.tokens += response.usage?.total_tokens || 0;

      // 4. Parse and execute actions from response
      const result = await this.parseAndExecute(response.content);

      // 5. Cache successful patterns
      this.confidence.cache(task, result);

      // 6. Update memory
      this.memory.addTurn('assistant', this.bot.username, result);
      this.memory.trim(this.config.agent?.max_history || 20);

      const elapsed = Date.now() - startTime;
      log.debug(`Decision in ${elapsed}ms | tokens: ${response.usage?.total_tokens || '?'}`);
      return result;
    } catch (err) {
      log.error(`LLM error: ${err.message}`);
      return `§cI had trouble processing that. Try again?`;
    }
  }

  /**
   * Parse LLM response and execute any actions found.
   * Supports both JSON actions and chat responses.
   */
  async parseAndExecute(text) {
    // Try JSON action format: {"action": "move", "params": {"x": 100, "y": 64, "z": 200}}
    const jsonMatch = text.match(/\{[\s\S]*"action"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const action = JSON.parse(jsonMatch[0]);
        const handler = this.actions.get(action.action);
        if (handler) {
          const result = await handler.execute(this.bot, action.params || {});
          return result;
        }
      } catch (e) {
        // Not valid JSON action, treat as chat
      }
    }

    // Plain text → send as chat
    if (text.length > 0 && text.length < 256) {
      this.bot.chat(text);
    }
    return text;
  }

  /**
   * Convenience methods for programmatic use
   */
  async go(x, y, z) { return this.executeCommand('system', `go ${x} ${y} ${z}`); }
  async mine(block) { return this.executeCommand('system', `mine ${block}`); }
  async build(description) { return this.execute(description); }
  async say(message) { this.bot.chat(message); }

  /**
   * Get current agent state
   */
  getState() {
    return {
      connected: this.bot?.entity != null,
      username: this.bot?.username,
      position: this.bot?.entity?.position,
      health: this.bot?.health,
      food: this.bot?.food,
      inventory: this.bot?.inventory?.items()?.map(i => `${i.name}x${i.count}`) || [],
      stats: this.stats,
    };
  }

  async stop() {
    this.running = false;
    if (this.bot) this.bot.quit('minecraft-use shutdown');
    if (this.skills) await this.skills.close();
    if (this.memory) await this.memory.close();
    log.info('Agent stopped.');
  }

  async reconnect() {
    log.info('Reconnecting in 5s...');
    await new Promise(r => setTimeout(r, 5000));
    try {
      this.bot = await createConnection(this.config.server);
      this.setupListeners();
      log.info('Reconnected!');
    } catch (err) {
      log.error(`Reconnect failed: ${err.message}`);
      if (this.config.agent?.auto_reconnect) this.reconnect();
    }
  }
}
