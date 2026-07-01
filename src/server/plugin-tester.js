/**
 * PluginTester — Automated plugin testing framework
 *
 * Joins a server, runs commands, verifies behavior, reports results.
 * Designed for testing Paper plugins like Lumora.
 */

import { log } from '../utils/logger.js';

export class PluginTester {
  constructor(agent) {
    this.agent = agent;
    this.bot = null;
    this.results = [];
  }

  /**
   * Run a full plugin test suite
   *
   * @param {Object} suite - Test suite definition
   * @param {string} suite.name - Suite name
   * @param {Array} suite.tests - Array of test cases
   * @param {string} suite.serverHost - Server to connect to
   * @param {number} suite.serverPort - Server port
   *
   * Example suite:
   * {
   *   name: "Lumora Duels",
   *   tests: [
   *     { name: "join", run: async (bot) => { bot.chat("/lumora"); } },
   *     { name: "check menu", expect: async (bot) => { return bot.inventory.items().length > 0; } },
   *     { name: "set spawn", run: async (bot) => { bot.chat("/lumora setspawn"); }, wait: 2000 },
   *   ]
   * }
   */
  async runSuite(suite) {
    log.info(`Running test suite: ${suite.name}`);
    this.results = [];
    const startTime = Date.now();

    for (const test of suite.tests) {
      const testResult = { name: test.name, passed: false, error: null, duration: 0 };
      const testStart = Date.now();

      try {
        // Setup phase
        if (test.setup) await test.setup(this.agent.bot);

        // Execute phase
        if (test.run) {
          await test.run(this.agent.bot);
        }

        // Wait if specified
        if (test.wait) {
          await new Promise(r => setTimeout(r, test.wait));
        }

        // Verify phase
        if (test.expect) {
          testResult.passed = await test.expect(this.agent.bot);
        } else {
          testResult.passed = true; // No assertion = pass if no error
        }

        // Capture state
        if (test.capture) {
          testResult.captured = await test.capture(this.agent.bot);
        }

      } catch (err) {
        testResult.passed = false;
        testResult.error = err.message;
      }

      testResult.duration = Date.now() - testStart;
      this.results.push(testResult);

      const status = testResult.passed ? '✅' : '❌';
      log.info(`  ${status} ${test.name} (${testResult.duration}ms)`);
      if (testResult.error) log.error(`    Error: ${testResult.error}`);
    }

    const totalDuration = Date.now() - startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    const report = {
      suite: suite.name,
      total: this.results.length,
      passed,
      failed,
      duration: totalDuration,
      tests: this.results,
    };

    log.info(`Suite "${suite.name}": ${passed}/${this.results.length} passed in ${totalDuration}ms`);
    return report;
  }

  /**
   * Quick test: run a command and check for response
   */
  async testCommand(command, expectedResponse = null, timeout = 5000) {
    const bot = this.agent.bot;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        bot.removeListener('chat', handler);
        if (expectedResponse) {
          reject(new Error(`Timeout waiting for response to: ${command}`));
        } else {
          resolve({ passed: true, response: null });
        }
      }, timeout);

      const handler = (username, message) => {
        if (username !== bot.username) {
          clearTimeout(timer);
          bot.removeListener('chat', handler);
          const passed = expectedResponse ? message.includes(expectedResponse) : true;
          resolve({ passed, response: message });
        }
      };

      bot.on('chat', handler);
      bot.chat(command);
    });
  }

  /**
   * Test: execute command and verify bot inventory changed
   */
  async testInventoryChange(action, expectedItems = []) {
    const bot = this.agent.bot;
    const before = bot.inventory.items().map(i => `${i.name}:${i.count}`);

    await action(bot);
    await new Promise(r => setTimeout(r, 2000)); // Wait for action

    const after = bot.inventory.items().map(i => `${i.name}:${i.count}`);
    const changed = JSON.stringify(before) !== JSON.stringify(after);

    return {
      passed: changed || expectedItems.length === 0,
      before,
      after,
    };
  }

  /**
   * Test: verify player position moved
   */
  async testMovement(targetX, targetY, targetZ, tolerance = 3) {
    const bot = this.agent.bot;
    const pos = bot.entity.position;
    const distance = Math.sqrt(
      Math.pow(pos.x - targetX, 2) +
      Math.pow(pos.y - targetY, 2) +
      Math.pow(pos.z - targetZ, 2)
    );

    return {
      passed: distance <= tolerance,
      position: { x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) },
      distance: Math.round(distance),
    };
  }

  /**
   * Generate a test report (markdown)
   */
  generateReport(suiteName, results) {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    let md = `# Plugin Test Report: ${suiteName}\n\n`;
    md += `**Date:** ${new Date().toISOString()}\n`;
    md += `**Result:** ${passed}/${total} passed ${failed > 0 ? `(${failed} failed)` : '✅'}\n\n`;

    md += `| Test | Result | Duration | Error |\n`;
    md += `|------|--------|----------|-------|\n`;
    for (const r of results) {
      const status = r.passed ? '✅' : '❌';
      md += `| ${r.name} | ${status} | ${r.duration}ms | ${r.error || '-'} |\n`;
    }

    return md;
  }

  /**
   * Export results as JSON
   */
  exportJSON(suiteName, results) {
    return JSON.stringify({
      suite: suiteName,
      timestamp: new Date().toISOString(),
      results,
    }, null, 2);
  }
}
