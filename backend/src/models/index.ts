import type { ModelConfig, ModelProvider } from '../types';

export function getDefaultModelConfig(provider: ModelProvider = 'deepseek'): ModelConfig {
  const configs: Record<ModelProvider, ModelConfig> = {
    deepseek: {
      provider: 'deepseek',
      model: 'deepseek-chat',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: 'https://api.deepseek.com/v1',
      temperature: 0.7,
      maxTokens: 8192,
    },
    openai: {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: 'https://api.openai.com/v1',
      temperature: 0.7,
      maxTokens: 8192,
    },
    claude: {
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      baseUrl: 'https://api.anthropic.com/v1',
      temperature: 0.7,
      maxTokens: 8192,
    },
    qwen: {
      provider: 'qwen',
      model: 'qwen-plus',
      apiKey: process.env.QWEN_API_KEY || '',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      temperature: 0.7,
      maxTokens: 8192,
    },
  };

  return configs[provider];
}

export function getAgentConfigs(provider: ModelProvider = 'deepseek'): import('../types').AgentConfig[] {
  const model = getDefaultModelConfig(provider);
  
  return [
    {
      role: 'planner',
      model: { ...model, temperature: 0.5 },
      systemPrompt: '',
      temperature: 0.5,
    },
    {
      role: 'writer',
      model: { ...model, temperature: 0.8 },
      systemPrompt: '',
      temperature: 0.8,
    },
    {
      role: 'editor',
      model: { ...model, temperature: 0.3 },
      systemPrompt: '',
      temperature: 0.3,
    },
    {
      role: 'character',
      model: { ...model, temperature: 0.6 },
      systemPrompt: '',
      temperature: 0.6,
    },
  ];
}
