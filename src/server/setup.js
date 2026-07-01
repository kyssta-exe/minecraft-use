/**
 * ServerSetup — Automated Minecraft server setup
 *
 * Install Paper, configure server, install plugins, manage configs.
 * Designed to run on the same machine as the bot.
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { log } from '../utils/logger.js';

export class ServerSetup {
  constructor(baseDir = '/opt/mc-server') {
    this.baseDir = baseDir;
  }

  /**
   * Install a Paper server from scratch
   */
  async installPaper(version = '1.21.4', port = 25565) {
    const dir = join(this.baseDir, `paper-${version}`);
    mkdirSync(dir, { recursive: true });

    log.info(`Installing Paper ${version} to ${dir}`);

    // Download Paper jar
    const apiUrl = `https://api.papermc.io/v2/projects/paper/versions/${version}/builds`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    const latestBuild = data.builds[data.builds.length - 1];
    const downloadUrl = `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latestBuild.build}/downloads/paper-${version}-${latestBuild.build}.jar`;

    execSync(`curl -L -o ${join(dir, 'paper.jar')} "${downloadUrl}"`, { stdio: 'inherit' });

    // Accept EULA
    writeFileSync(join(dir, 'eula.txt'), 'eula=true\n');

    // Generate server.properties
    this.writeServerProperties(dir, { port, 'online-mode': false });

    // Generate start script
    writeFileSync(join(dir, 'start.sh'), `#!/bin/bash
java -Xms1G -Xmx2G -jar paper.jar --nogui
`);
    execSync(`chmod +x ${join(dir, 'start.sh')}`);

    log.info(`Paper ${version} installed at ${dir}`);
    return { dir, version, port };
  }

  /**
   * Start the server
   */
  startServer(dir) {
    const startScript = join(dir, 'start.sh');
    if (!existsSync(startScript)) throw new Error('No start.sh found');

    log.info(`Starting server in ${dir}`);
    const proc = spawn('bash', [startScript], {
      cwd: dir,
      stdio: 'pipe',
      detached: true,
    });

    proc.unref();
    return { pid: proc.pid, dir };
  }

  /**
   * Stop the server via RCON or screen
   */
  async stopServer(dir, method = 'screen') {
    if (method === 'screen') {
      try {
        execSync(`screen -S mc-server -X stuff "stop\n"`, { timeout: 10000 });
        log.info('Server stop command sent');
      } catch {
        // Try killing the process
        execSync(`pkill -f "paper.jar"`, { timeout: 5000 });
        log.info('Server process killed');
      }
    }
  }

  /**
   * Install a plugin jar into the server
   */
  installPlugin(serverDir, pluginJarPath) {
    const pluginsDir = join(serverDir, 'plugins');
    mkdirSync(pluginsDir, { recursive: true });
    execSync(`cp "${pluginJarPath}" "${pluginsDir}/"`);
    log.info(`Installed plugin: ${pluginJarPath}`);
    return join(pluginsDir, pluginJarPath.split('/').pop());
  }

  /**
   * Install multiple plugins from a directory
   */
  installPlugins(serverDir, pluginDir) {
    const installed = [];
    if (!existsSync(pluginDir)) return installed;

    const files = readdirSync(pluginDir).filter(f => f.endsWith('.jar'));
    for (const file of files) {
      this.installPlugin(serverDir, join(pluginDir, file));
      installed.push(file);
    }
    log.info(`Installed ${installed.length} plugins`);
    return installed;
  }

  /**
   * Write server.properties
   */
  writeServerProperties(dir, props = {}) {
    const defaults = {
      'server-port': 25565,
      'online-mode': false,
      'max-players': 20,
      'level-name': 'world',
      'gamemode': 'survival',
      'difficulty': 'normal',
      'white-list': false,
      'spawn-protection': 0,
      'view-distance': 10,
      'simulation-distance': 10,
    };

    const allProps = { ...defaults, ...props };
    const content = Object.entries(allProps)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    writeFileSync(join(dir, 'server.properties'), content + '\n');
  }

  /**
   * Write a plugin config file (YAML)
   */
  async writePluginConfig(serverDir, pluginName, config) {
    const configDir = join(serverDir, 'plugins', pluginName);
    mkdirSync(configDir, { recursive: true });

    const { stringify } = await import('yaml');
    const content = stringify(config);
    writeFileSync(join(configDir, 'config.yml'), content);
    log.info(`Wrote config for ${pluginName}`);
  }

  /**
   * Read server logs
   */
  getLogs(dir, lines = 50) {
    const latestLog = join(dir, 'logs', 'latest.log');
    if (!existsSync(latestLog)) return 'No logs found';
    try {
      const output = execSync(`tail -n ${lines} "${latestLog}"`, { encoding: 'utf-8' });
      return output;
    } catch {
      return 'Failed to read logs';
    }
  }

  /**
   * Check if server is running
   */
  isRunning(dir) {
    try {
      const output = execSync('pgrep -f "paper.jar" || true', { encoding: 'utf-8' }).trim();
      return output.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get server status (players, memory, etc.)
   */
  getStatus(dir) {
    const running = this.isRunning(dir);
    const logs = this.getLogs(dir, 5);

    return {
      running,
      dir,
      logs,
      pid: running ? execSync('pgrep -f "paper.jar"', { encoding: 'utf-8' }).trim() : null,
    };
  }
}
