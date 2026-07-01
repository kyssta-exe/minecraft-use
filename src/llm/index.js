/**
 * LLM Provider Abstraction
 *
 * Supports: Anthropic, OpenAI, Google, Groq, Ollama, DeepSeek,
 * Mistral, Qwen, xAI, LM Studio, vLLM, OpenRouter, Azure,
 * Cerebras, HuggingFace, Replicate, Mercury, Novita, Hyperbolic
 */

import { log } from '../utils/logger.js';

export function createLLM(config) {
  const provider = config.provider || 'anthropic';

  const providers = {
    anthropic: AnthropicLLM,
    openai: OpenAILLM,
    google: GoogleLLM,
    groq: GroqLLM,
    ollama: OllamaLLM,
    deepseek: DeepSeekLLM,
    mistral: MistralLLM,
    qwen: QwenLLM,
    xai: XaiLLM,
    lmstudio: LMStudioLLM,
    vllm: VLLMLLM,
    openrouter: OpenRouterLLM,
    azure: AzureLLM,
    cerebras: CerebrasLLM,
    huggingface: HuggingFaceLLM,
    replicate: ReplicateLLM,
    mercury: MercuryLLM,
    novita: NovitaLLM,
    hyperbolic: HyperbolicLLM,
  };

  const ProviderClass = providers[provider];
  if (!ProviderClass) {
    throw new Error(`Unknown LLM provider: ${provider}. Available: ${Object.keys(providers).join(', ')}`);
  }

  return new ProviderClass(config);
}

// === OpenAI-compatible base class ===
class OpenAICompatibleLLM {
  constructor(config, defaultModel, apiKeyEnv, baseUrl) {
    this.model = config.model || defaultModel;
    this.apiKey = process.env[apiKeyEnv];
    this.baseUrl = baseUrl;
    this.client = null;
  }

  async init() {
    try {
      const mod = await import('openai');
      this.client = new mod.default({
        apiKey: this.apiKey,
        baseURL: this.baseUrl,
      });
    } catch {
      log.warn('OpenAI SDK not installed. Run: npm install openai');
    }
  }

  async chat(messages, systemPrompt) {
    if (!this.client) await this.init();
    if (!this.client) throw new Error('Client not initialized');

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

// === Anthropic ===
class AnthropicLLM {
  constructor(config) {
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.client = null;
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
    if (!this.client) await this.init();
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

// === OpenAI ===
class OpenAILLM extends OpenAICompatibleLLM {
  constructor(config) {
    super(config, 'gpt-4o', 'OPENAI_API_KEY', 'https://api.openai.com/v1');
  }
}

// === Google (Gemini) ===
class GoogleLLM {
  constructor(config) {
    this.model = config.model || 'gemini-2.0-flash';
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  async chat(messages, systemPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const allText = systemPrompt + '\n\n' + messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: allText }] }],
        generationConfig: { maxOutputTokens: 1024 },
      }),
    });

    const data = await response.json();
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  }
}

// === Groq ===
class GroqLLM extends OpenAICompatibleLLM {
  constructor(config) {
    super(config, 'llama-3.3-70b-versatile', 'GROQCLOUD_API_KEY', 'https://api.groq.com/openai/v1');
  }
}

// === Ollama (Local) ===
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

// === DeepSeek ===
class DeepSeekLLM extends OpenAICompatibleLLM {
  constructor(config) {
    super(config, 'deepseek-chat', 'DEEPSEEK_API_KEY', 'https://api.deepseek.com');
  }
}

// === Mistral ===
class MistralLLM extends OpenAICompatibleLLM {
  constructor(config) {
    super(config, 'mistral-large-latest', 'MISTRAL_API_KEY', 'https://api.mistral.ai/v1');
  }
}

// === Qwen ===
class QwenLLM extends OpenAICompatibleLLM {
  constructor(config) {
    super(config, 'qwen-plus', 'QWEN_API_KEY', 'https://dashscope.aliyuncs.com/compatible-mode/v1');
  }
}

// === xAI (Grok) ===
class XaiLLM extends OpenAICompatibleLLM {
  constructor(config) {
    super(config, 'grok-3', 'XAI_API_KEY', 'https://api.x.ai/v1');
  }
}

// === LM Studio ===
class LMStudioLLM extends OpenAICompatibleLLM {
  constructor(config) {
    super(config, 'local-model', 'LMSTUDIO_API_KEY', process.env.LMSTUDIO_URL || 'http://localhost:1234/v1');
  }
}

// === vLLM ===
class VLLMLLM extends OpenAICompatibleLLM {
  constructor(config) {
    super(config, 'local-model', 'VLLM_API_KEY', process.env.VLLM_URL || 'http://localhost:8000/v1');
  }
}

// === OpenRouter ===
class OpenRouterLLM extends OpenAICompatibleLLM {
  constructor(config) {
    super(config, 'anthropic/claude-sonnet-4', 'OPENROUTER_API_KEY', 'https://openrouter.ai/api/v1');
  }
}

// === Azure OpenAI ===
class AzureLLM {
  constructor(config) {
    this.model = config.model || 'gpt-4o';
    this.endpoint = process.env.AZURE_ENDPOINT;
    this.apiKey = process.env.AZURE_API_KEY;
    this.deployment = process.env.AZURE_DEPLOYMENT;
    this.client = null;
  }

  async init() {
    try {
      const mod = await import('openai');
      this.client = new mod.default({
        apiKey: this.apiKey,
        baseURL: `${this.endpoint}/openai/deployments/${this.deployment}`,
        defaultQuery: { 'api-version': '2024-02-15-preview' },
        defaultHeaders: { 'api-key': this.apiKey },
      });
    } catch {
      log.warn('OpenAI SDK not installed');
    }
  }

  async chat(messages, systemPrompt) {
    if (!this.client) await this.init();
    return new OpenAICompatibleLLM({ model: this.model }, this.model, '', '').chat.call(this, messages, systemPrompt);
  }
}

// === Cerebras ===
class CerebrasLLM extends OpenAICompatibleLLM {
  constructor(config) {
    super(config, 'llama-3.3-70b', 'CEREBRAS_API_KEY', 'https://api.cerebras.ai/v1');
  }
}

// === HuggingFace ===
class HuggingFaceLLM extends OpenAICompatibleLLM {
  constructor(config) {
    super(config, 'meta-llama/Llama-3.3-70B-Instruct', 'HF_API_KEY', 'https://api-inference.huggingface.co/v1');
  }
}

// === Replicate ===
class ReplicateLLM {
  constructor(config) {
    this.model = config.model || 'meta/meta-llama-3.1-70b-instruct';
    this.apiKey = process.env.REPLICATE_API_TOKEN;
  }

  async chat(messages, systemPrompt) {
    const response = await fetch('https://api.replicate.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1024,
      }),
    });

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage || { total_tokens: 0 },
    };
  }
}

// === Mercury ===
class MercuryLLM extends OpenAICompatibleLLM {
  constructor(config) {
    super(config, 'mercury-coder', 'MERCURY_API_KEY', 'https://api.mercury.co/v1');
  }
}

// === Novita ===
class NovitaLLM extends OpenAICompatibleLLM {
  constructor(config) {
    super(config, 'meta-llama/llama-3.1-70b-instruct', 'NOVITA_API_KEY', 'https://api.novita.ai/v3/openai');
  }
}

// === Hyperbolic ===
class HyperbolicLLM extends OpenAICompatibleLLM {
  constructor(config) {
    super(config, 'meta-llama/Meta-Llama-3.1-70B-Instruct', 'HYPERBOLIC_API_KEY', 'https://api.hyperbolic.xyz/v1');
  }
}
