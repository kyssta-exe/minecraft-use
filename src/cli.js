#!/usr/bin/env node

import { program } from 'commander';
import { createAgent } from './index.js';
import { ServerSetup } from './server/setup.js';
import { PluginTester } from './server/plugin-tester.js';
import { log, setLogLevel } from './utils/logger.js';

program
  .name('minecraft-use')
  .description('AI agent for Minecraft — server setup, plugin testing, and automation')
  .version('0.0.1-beta.1');

program
  .command('start')
  .description('Start the agent and connect to a Minecraft server')
  .option('-c, --config <path>', 'config file path', 'config.yaml')
  .option('-s, --server <host>', 'server host')
  .option('-p, --port <port>', 'server port', '25565')
  .option('-u, --username <name>', 'bot username')
  .option('-v, --verbose', 'verbose logging')
  .action(async (opts) => {
    if (opts.verbose) setLogLevel('debug');
    log.info('minecraft-use v0.0.1-beta.1');
    const agent = await createAgent({
      config: opts.config,
      server: { host: opts.server, port: parseInt(opts.port) },
      username: opts.username,
    });
    await agent.start();
  });

program
  .command('setup')
  .description('Install and configure a Minecraft server')
  .option('--dir <path>', 'server directory', '/opt/mc-server')
  .option('--version <ver>', 'Minecraft version', '1.21.4')
  .option('--port <port>', 'server port', '25565')
  .option('--plugins <dir>', 'directory with plugin .jar files')
  .action(async (opts) => {
    const setup = new ServerSetup(opts.dir);

    // Install Paper
    const { dir } = await setup.installPaper(opts.version, parseInt(opts.port));

    // Install plugins
    if (opts.plugins) {
      const installed = setup.installPlugins(dir, opts.plugins);
      log.info(`Installed plugins: ${installed.join(', ')}`);
    }

    // Start server
    const { pid } = setup.startServer(dir);
    log.info(`Server started (PID: ${pid})`);
    log.info(`Connect: localhost:${opts.port}`);
  });

program
  .command('test')
  .description('Run plugin tests against a server')
  .requiredOption('-s, --server <host>', 'server host')
  .option('-p, --port <port>', 'server port', '25565')
  .option('-c, --config <path>', 'agent config', 'config.yaml')
  .option('--suite <path>', 'test suite JSON file')
  .action(async (opts) => {
    const agent = await createAgent({
      config: opts.config,
      server: { host: opts.server, port: parseInt(opts.port) },
    });
    await agent.start();

    const tester = new PluginTester(agent);

    if (opts.suite) {
      const { readFileSync } = await import('fs');
      const suite = JSON.parse(readFileSync(opts.suite, 'utf-8'));
      const results = await tester.runSuite(suite);
      console.log(tester.generateReport(suite.name, results));
    } else {
      // Quick smoke test
      log.info('Running smoke test...');
      const result = await tester.testCommand('help', null, 5000);
      log.info(result.passed ? '✅ Server responding' : '❌ Server not responding');
    }

    await agent.stop();
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
  .command('status')
  .description('Check server status')
  .option('--dir <path>', 'server directory', '/opt/mc-server')
  .action(async (opts) => {
    const setup = new ServerSetup(opts.dir);
    const status = setup.getStatus(opts.dir);
    console.log(`Running: ${status.running ? '✅ Yes' : '❌ No'}`);
    console.log(`Directory: ${status.dir}`);
    if (status.pid) console.log(`PID: ${status.pid}`);
    if (status.logs) console.log(`\nRecent logs:\n${status.logs}`);
  });

program.parse();
