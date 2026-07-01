/**
 * LLM Provider Abstraction
 *
 * Supports: Anthropic (Claude), OpenAI (GPT), Ollama (local)
 */

import { log } from '../utils/logger.js';

export function createLLM(config) {
  const provider = config.provider || 'anthropic';

  switch (provider) {
    case 'anthropic':
      return new AnthropicLLM(config);
    case 'openai':
      return new OpenAILLM(config);
    case 'ollama':
      return new OllamaLLM(config);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

class AnthropicLLM {
  constructor(config) {
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.client = null;
    this.init();
  }

  async init() {
    try {
      const mod = await import('@anthropic-ai/sdk');
      this.client = new mod.default({ apiKey: this.apiKey });
    } catch {
      log.warn('Anthropic SDK not installed. Run: npm install @anthropic-ai/sdk');
    }
  }

  async chat(messages, systemPrompt) {
    if (!this.client) throw new Error('Anthropic client not initialized');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    });

    return {
      content: response.content[0]?.text || '',
      usage: response.usage,
    };
  }
}

class OpenAILLM {
  constructor(config) {
    this.model = config.model || 'gpt-4o';
    this.apiKey = process.env.OPENAI_API_KEY;
    this.client = null;
    this.init();
  }

  async init() {
    try {
      const mod = await import('openai');
      this.client = new mod.default({ apiKey: this.apiKey });
    } catch {
      log.warn('OpenAI SDK not installed. Run: npm install openai');
    }
  }

  async chat(messages, systemPrompt) {
    if (!this.client) throw new Error('OpenAI client not initialized');

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      ],
    });

    return {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage,
    };
  }
}

class OllamaLLM {
  constructor(config) {
    this.model = config.model || 'llama3.3:70b';
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  }

  async chat(messages, systemPrompt) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: false,
      }),
    });

    const data = await response.json();
    return {
      content: data.message?.content || '',
      usage: {
        prompt_tokens: data.prompt_eval_count || 0,
        completion_tokens: data.eval_count || 0,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    };
  }
}
