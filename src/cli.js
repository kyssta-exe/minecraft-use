#!/usr/bin/env node

import { program } from 'commander';
import { createAgent } from './index.js';
import { log, setLogLevel } from './utils/logger.js';

program
  .name('minecraft-use')
  .description('AI agent for Minecraft — connect any LLM to any server')
  .version('0.0.1-beta.1');

program
  .command('start')
  .description('Start the agent and connect to a Minecraft server')
  .option('-c, --config <path>', 'config file path', 'config.yaml')
  .option('-s, --server <host>', 'server host')
  .option('-p, --port <port>', 'server port', '25565')
  .option('-u, --username <name>', 'bot username')
  .option('--auth <type>', 'auth type: offline, microsoft')
  .option('-v, --verbose', 'verbose logging')
  .action(async (opts) => {
    if (opts.verbose) setLogLevel('debug');
    log.info('minecraft-use v0.0.1-beta.1');
    const agent = await createAgent({
      config: opts.config,
      server: { host: opts.server, port: parseInt(opts.port), auth: opts.auth },
      username: opts.username,
    });
    await agent.start();
  });

program
  .command('mcp')
  .description('Start as MCP server (for Claude Desktop etc.)')
  .option('-c, --config <path>', 'config file path', 'config.yaml')
  .option('-p, --port <port>', 'MCP server port', '8088')
  .action(async (opts) => {
    const { startMCPServer } = await import('./mcp/server.js');
    await startMCPServer(opts);
  });

program
  .command('connect')
  .description('Connect to a server and run a single command')
  .argument('<command>', 'command to execute')
  .option('-c, --config <path>', 'config file path', 'config.yaml')
  .action(async (command, opts) => {
    const agent = await createAgent({ config: opts.config });
    await agent.start();
    const result = await agent.execute(command);
    log.info(result);
    await agent.stop();
  });

program.parse();
