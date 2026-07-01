/**
 * Mineflayer connection wrapper
 */

import mineflayer from 'mineflayer';

export function createConnection(config) {
  return new Promise((resolve, reject) => {
    const bot = mineflayer.createBot({
      host: config.host || 'localhost',
      port: parseInt(config.port) || 25565,
      username: config.username || 'minecraft-use-bot',
      version: config.version || false,
      auth: config.auth || 'offline',
    });

    bot.once('spawn', () => resolve(bot));
    bot.once('error', (err) => reject(err));
    bot.once('kicked', (reason) => reject(new Error(`Kicked: ${reason}`)));

    // Timeout
    setTimeout(() => reject(new Error('Connection timeout (10s)')), 10000);
  });
}
