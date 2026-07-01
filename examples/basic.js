// Example: Mining diamonds with minecraft-use
//
// This script shows programmatic usage of the agent.

import { createAgent } from '../src/index.js';

async function main() {
  const agent = await createAgent({
    server: {
      host: 'localhost',
      port: 25565,
      username: 'mine-bot',
    },
    llm: {
      provider: 'ollama',
      model: 'llama3.3:70b',
    },
  });

  await agent.start();
  console.log('Connected!');

  // Mine diamond ore
  const result = await agent.mine('diamond_ore');
  console.log('Mining result:', result);

  // Check inventory
  const state = agent.getState();
  console.log('Inventory:', state.inventory);

  await agent.stop();
}

main().catch(console.error);
