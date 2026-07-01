/**
 * ChatHandler — Process game chat commands
 *
 * Handles commands like:
 *   !mine diamond_ore 3
 *   !go 100 64 200
 *   !goto Steve
 *   !help
 *   Natural language: "Hey bot, can you mine some iron?"
 */

export class ChatHandler {
  constructor(agent) {
    this.agent = agent;
  }

  /**
   * Parse and execute a chat command
   */
  async handle(username, message, prefix = '!') {
    if (!message.startsWith(prefix)) return null;

    const raw = message.slice(prefix.length).trim();
    const parts = raw.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Built-in actions
    const action = this.agent.actions.get(cmd);
    if (action) {
      return action.execute(this.agent.bot, args, { username });
    }

    // Unknown command → treat as natural language task
    return this.agent.execute(raw, username);
  }
}
