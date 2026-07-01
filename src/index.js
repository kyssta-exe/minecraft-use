/**
 * minecraft-use — AI agent for Minecraft
 *
 * Server setup, plugin testing, and automation.
 * Connect any LLM to any Minecraft server.
 */

import { MinecraftUse } from './agent/agent.js';
import { loadConfig } from './utils/config.js';
import { ServerSetup } from './server/setup.js';
import { PluginTester } from './server/plugin-tester.js';

export { MinecraftUse } from './agent/agent.js';
export { ContextBuilder } from './agent/context.js';
export { ConfidenceEngine } from './agent/confidence.js';
export { SkillLibrary } from './skills/library.js';
export { Memory } from './agent/memory.js';
export { createLLM } from './llm/index.js';
export { loadConfig } from './utils/config.js';
export { ServerSetup } from './server/setup.js';
export { PluginTester } from './server/plugin-tester.js';

export async function createAgent(options = {}) {
  const config = await loadConfig(options.config);
  const agent = new MinecraftUse({ ...config, ...options });
  return agent;
}
