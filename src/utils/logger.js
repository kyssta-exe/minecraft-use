/**
 * Logger — Simple colored console output
 */

import chalk from 'chalk';

let level = 'info';
const levels = { debug: 0, info: 1, warn: 2, error: 3 };

export function setLogLevel(lvl) {
  level = lvl;
}

export const log = {
  debug: (...args) => {
    if (levels[level] <= 0) console.log(chalk.gray('[debug]'), ...args);
  },
  info: (...args) => {
    if (levels[level] <= 1) console.log(chalk.cyan('[info]'), ...args);
  },
  warn: (...args) => {
    if (levels[level] <= 2) console.log(chalk.yellow('[warn]'), ...args);
  },
  error: (...args) => {
    if (levels[level] <= 3) console.log(chalk.red('[error]'), ...args);
  },
};
