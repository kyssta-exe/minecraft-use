/**
 * ActionRegistry — Built-in action commands
 *
 * These execute directly without LLM calls.
 * Registered as the first thing the agent tries.
 */

import { log } from '../utils/logger.js';

export class ActionRegistry {
  constructor() {
    this.actions = new Map();
  }

  register(name, description, execute) {
    this.actions.set(name, { name, description, execute });
  }

  get(name) {
    return this.actions.get(name);
  }

  list() {
    return [...this.actions.values()].map(a => `${a.name}: ${a.description}`);
  }

  registerDefaults(agent) {
    const bot = () => agent.bot;

    // === Movement ===
    this.register('go', 'Move to coordinates: go <x> <y> <z>', async (b, args) => {
      const [x, y, z] = args.map(Number);
      if ([x, y, z].some(isNaN)) return '§cUsage: go <x> <y> <z>';
      const { pathfinder, goals } = await import('mineflayer-pathfinder');
      const { Movements, GoalNear } = goals;
      b.loadPlugin(pathfinder);
      const mcData = (await import('minecraft-data')).default(b.version);
      const movements = new Movements(b, mcData);
      b.pathfinder.setMovements(movements);
      b.pathfinder.setGoal(new GoalNear(x, y, z, 2));
      return `§aMoving to ${x} ${y} ${z}`;
    });

    this.register('goto', 'Go to a player: goto <name>', async (b, args) => {
      const target = args[0];
      if (!target) return '§cUsage: goto <player>';
      const player = b.players[target];
      if (!player) return `§cPlayer ${target} not found`;
      const { pathfinder, goals } = await import('mineflayer-pathfinder');
      const { Movements, GoalNear } = goals;
      b.loadPlugin(pathfinder);
      const mcData = (await import('minecraft-data')).default(b.version);
      b.pathfinder.setMovements(new Movements(b, mcData));
      b.pathfinder.setGoal(new GoalNear(player.entity.position.x, player.entity.position.y, player.entity.position.z, 2));
      return `§aGoing to ${target}`;
    });

    // === Mining ===
    this.register('mine', 'Mine a block type: mine <block> [count]', async (b, args) => {
      const blockName = args[0];
      const count = parseInt(args[1]) || 1;
      if (!blockName) return '§cUsage: mine <block> [count]';
      const { pathfinder, goals } = await import('mineflayer-pathfinder');
      const { Movements, GoalNear } = goals;
      const collectBlock = (await import('mineflayer-collectblock')).default;
      b.loadPlugin(pathfinder);
      b.loadPlugin(collectBlock);
      const mcData = (await import('minecraft-data')).default(b.version);
      b.pathfinder.setMovements(new Movements(b, mcData));

      const block = mcData.blocksByName[blockName];
      if (!block) return `§cUnknown block: ${blockName}`;

      try {
        const collected = await b.collectBlock.collect([block.id], count);
        return `§aMined ${count}x ${blockName}`;
      } catch (err) {
        return `§cFailed to mine ${blockName}: ${err.message}`;
      }
    });

    // === Inventory ===
    this.register('equip', 'Equip an item: equip <item>', async (b, args) => {
      const itemName = args.join(' ');
      if (!itemName) return '§cUsage: equip <item>';
      const item = b.inventory.items().find(i => i.name.includes(itemName));
      if (!item) return `§cYou don't have ${itemName}`;
      await b.equip(item, 'hand');
      return `§aEquipped ${item.name}`;
    });

    this.register('drop', 'Drop an item: drop <item> [count]', async (b, args) => {
      const itemName = args[0];
      const count = parseInt(args[1]) || 1;
      if (!itemName) return '§cUsage: drop <item> [count]';
      const item = b.inventory.items().find(i => i.name.includes(itemName));
      if (!item) return `§cYou don't have ${itemName}`;
      await b.toss(item.type, null, count);
      return `§aDropped ${count}x ${item.name}`;
    });

    this.register('inv', 'Show inventory', async (b) => {
      const items = b.inventory.items();
      if (items.length === 0) return 'Inventory: empty';
      const counts = {};
      for (const item of items) {
        counts[item.name] = (counts[item.name] || 0) + item.count;
      }
      return Object.entries(counts).map(([n, c]) => `${n}x${c}`).join(', ');
    });

    // === Combat ===
    this.register('attack', 'Attack nearest mob: attack [type]', async (b, args) => {
      const filter = args[0]
        ? (e) => e.name?.includes(args[0]) && e.position?.distanceTo(b.entity.position) < 16
        : (e) => e.type === 'hostile' && e.position?.distanceTo(b.entity.position) < 16;
      const target = b.nearestEntity(filter);
      if (!target) return '§cNo target found';
      b.attack(target);
      return `§aAttacking ${target.name || target.username || 'entity'}`;
    });

    // === Building ===
    this.register('place', 'Place a held block: place', async (b) => {
      const block = b.blockAtCursor(5);
      if (!block) return '§cNo block in range';
      const faceVector = { x: 0, y: 1, z: 0 };
      await b.placeBlock(block, faceVector);
      return '§aBlock placed';
    });

    // === Server ===
    this.register('cmd', 'Run a server command: cmd <command>', async (b, args) => {
      const cmd = args.join(' ');
      if (!cmd) return '§cUsage: cmd <command>';
      b.chat(`/${cmd}`);
      return `§aExecuted: /${cmd}`;
    });

    this.register('say', 'Send chat message: say <message>', async (b, args) => {
      const msg = args.join(' ');
      if (!msg) return '§cUsage: say <message>';
      b.chat(msg);
      return `§aSaid: ${msg}`;
    });

    // === Info ===
    this.register('pos', 'Show current position', async (b) => {
      const p = b.entity.position;
      return `Position: ${Math.round(p.x)}, ${Math.round(p.y)}, ${Math.round(p.z)}`;
    });

    this.register('health', 'Show health and food', async (b) => {
      return `Health: ${Math.round(b.health)}/20 | Food: ${Math.round(b.food)}/20`;
    });

    this.register('help', 'List all actions', async () => {
      return this.list().join(' | ');
    });
  }
}
