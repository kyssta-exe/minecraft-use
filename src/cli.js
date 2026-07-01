#!/usr/bin/env node

import { program } from 'commander';
import { createAgent } from './index.js';
import { APIServer } from './api/server.js';
import { ServerSetup } from './server/setup.js';
import { PluginTester } from './server/plugin-tester.js';
import { log, setLogLevel } from './utils/logger.js';

program
  .name('minecraft-use')
  .description('All-in-one AI agent for Minecraft — server setup, plugin testing, gameplay, building, mining')
  .version('0.0.1-beta.1');

program
  .command('start')
  .description('Start agent + API server + connect to Minecraft')
  .option('-c, --config <path>', 'config file', 'config.yaml')
  .option('-s, --server <host>', 'server host')
  .option('-p, --port <port>', 'server port', '25565')
  .option('-u, --username <name>', 'bot username')
  .option('--api-port <port>', 'API server port', '8088')
  .option('--no-api', 'disable API server')
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

    if (opts.api !== false) {
      const api = new APIServer(agent, { port: parseInt(opts.apiPort) });
      await api.start();
      agent.apiServer = api;
    }

    log.info('Agent ready. Commands:');
    log.info('  Game chat: !mine diamond_ore 3, !go 100 64 200, !help');
    log.info('  API: http://localhost:' + opts.apiPort);
    log.info('  WebSocket: ws://localhost:' + opts.apiPort);
  });

program
  .command('setup')
  .description('Install and configure a Minecraft server')
  .option('--dir <path>', 'server directory', '/opt/mc-server')
  .option('--version <ver>', 'Minecraft version', '1.21.4')
  .option('--port <port>', 'server port', '25565')
  .option('--plugins <dir>', 'plugin directory')
  .action(async (opts) => {
    const setup = new ServerSetup(opts.dir);
    const { dir } = await setup.installPaper(opts.version, parseInt(opts.port));
    if (opts.plugins) setup.installPlugins(dir, opts.plugins);
    const { pid } = setup.startServer(dir);
    log.info(`Server running (PID: ${pid}) at ${dir}`);
  });

program
  .command('test')
  .description('Run plugin tests')
  .option('-s, --server <host>', 'server host', 'localhost')
  .option('-p, --port <port>', 'server port', '25565')
  .option('-c, --config <path>', 'config', 'config.yaml')
  .option('--suite <path>', 'test suite JSON')
  .action(async (opts) => {
    const agent = await createAgent({ config: opts.config, server: { host: opts.server, port: parseInt(opts.port) } });
    await agent.start();
    const tester = new PluginTester(agent);
    if (opts.suite) {
      const { readFileSync } = await import('fs');
      const suite = JSON.parse(readFileSync(opts.suite, 'utf-8'));
      const results = await tester.runSuite(suite);
      console.log(tester.generateReport(suite.name, results));
    } else {
      const result = await tester.testCommand('help', null, 5000);
      log.info(result.passed ? '✅ Server responding' : '❌ Server not responding');
    }
    await agent.stop();
  });

program
  .command('status')
  .description('Check server status')
  .option('--dir <path>', 'server directory', '/opt/mc-server')
  .action((opts) => {
    const setup = new ServerSetup(opts.dir);
    const status = setup.getStatus(opts.dir);
    console.log(`Running: ${status.running ? '✅' : '❌'}`);
    console.log(`Directory: ${status.dir}`);
    if (status.pid) console.log(`PID: ${status.pid}`);
    if (status.logs) console.log(`\nLogs:\n${status.logs}`);
  });

program
  .command('api')
  .description('Start API server only (no Minecraft connection)')
  .option('--port <port>', 'port', '8088')
  .option('-c, --config <path>', 'config', 'config.yaml')
  .action(async (opts) => {
    const agent = await createAgent({ config: opts.config });
    const api = new APIServer(agent, { port: parseInt(opts.port) });
    await api.start();
    log.info('API-only mode. Connect Minecraft later via POST /agent/start');
  });

program.parse();
