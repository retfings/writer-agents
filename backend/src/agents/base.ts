import type { ModelConfig, AgentConfig, AgentRole, AgentResult } from '../types';

export interface AgentCallOptions {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export abstract class BaseAgent {
  role: AgentRole;
  protected config: AgentConfig;
  protected modelConfig: ModelConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.role = config.role;
    this.modelConfig = config.model;
  }

  abstract getSystemPrompt(context?: Record<string, any>): string;

  protected async callModel(opts: AgentCallOptions): Promise<AgentResult> {
    const { default: OpenAI } = await import('openai');

    const client = new OpenAI({
      apiKey: this.modelConfig.apiKey || process.env.DEEPSEEK_API_KEY || '',
      baseURL: this.modelConfig.baseUrl || 'https://api.deepseek.com/v1',
    });

    const completion = await client.chat.completions.create({
      model: this.modelConfig.model,
      messages: opts.messages as any,
      temperature: opts.temperature ?? this.modelConfig.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? this.modelConfig.maxTokens ?? 4096,
    });

    const content = completion.choices[0]?.message?.content || '';

    return {
      role: this.role,
      content,
      usage: {
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
      },
    };
  }

  async execute(context: Record<string, any>): Promise<AgentResult> {
    const systemPrompt = this.getSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(context);

    return this.callModel({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
  }

  protected abstract buildUserPrompt(context: Record<string, any>): string;
}
