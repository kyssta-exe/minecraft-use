/**
 * Config loader — YAML + env vars
 */

import { readFileSync, existsSync } from 'fs';
import { parse } from 'yaml';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export async function loadConfig(configPath = 'config.yaml') {
  let fileConfig = {};

  if (existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf-8');
    fileConfig = parse(content) || {};
  }

  // Env var overrides
  const config = {
    server: {
      host: process.env.MC_HOST || fileConfig.server?.host || 'localhost',
      port: process.env.MC_PORT || fileConfig.server?.port || 25565,
      username: process.env.MC_USERNAME || fileConfig.server?.username || 'minecraft-use-bot',
      version: process.env.MC_VERSION || fileConfig.server?.version || false,
      auth: process.env.MC_AUTH || fileConfig.server?.auth || 'offline',
    },
    llm: {
      provider: process.env.MODEL_PROVIDER || fileConfig.llm?.provider || 'anthropic',
      model: process.env.MODEL_NAME || fileConfig.llm?.model || 'claude-sonnet-4-20250514',
    },
    agent: {
      prefix: process.env.MCU_PREFIX || fileConfig.agent?.prefix || '!',
      max_history: fileConfig.agent?.max_history || 20,
      context_budget: fileConfig.agent?.context_budget || 4096,
      confidence_threshold: fileConfig.agent?.confidence_threshold || 0.85,
      auto_reconnect: fileConfig.agent?.auto_reconnect !== false,
      vision_enabled: fileConfig.agent?.vision_enabled || false,
    },
    skills: {
      db_path: process.env.MCU_SKILLS_DB || fileConfig.skills?.db_path || './data/skills.db',
    },
    memory: {
      db_path: process.env.MCU_MEMORY_DB || fileConfig.memory?.db_path || './data/memory.db',
    },
    mcp: {
      enabled: fileConfig.mcp?.enabled || false,
      port: fileConfig.mcp?.port || 8088,
    },
  };

  return config;
}
