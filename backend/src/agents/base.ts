import type { ModelConfig, AgentConfig, AgentRole, AgentResult } from '../types';
import { createApprovalRequest, waitForApproval } from '../routes/approvals';

export interface AgentCallOptions {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ApprovalContext {
  projectId?: string;
  userId?: string;
  approvalMode?: 'auto' | 'manual';
}

export abstract class BaseAgent {
  role: AgentRole;
  protected config: AgentConfig;
  protected modelConfig: ModelConfig;
  protected approvalContext: ApprovalContext = {};

  constructor(config: AgentConfig) {
    this.config = config;
    this.role = config.role;
    this.modelConfig = config.model;
  }

  setApprovalContext(ctx: ApprovalContext): void {
    this.approvalContext = ctx;
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

  protected async callModelWithApproval(opts: AgentCallOptions): Promise<AgentResult> {
    const { approvalMode, projectId, userId } = this.approvalContext;

    if (approvalMode === 'manual' && projectId && userId) {
      const systemPrompt = opts.messages.find(m => m.role === 'system')?.content || '';
      const userPrompt = opts.messages.find(m => m.role === 'user')?.content || '';

      const requestId = createApprovalRequest({
        projectId,
        userId,
        agentType: this.role,
        systemPrompt,
        userPrompt,
      });

      const result = await waitForApproval(requestId);

      if (!result.approved) {
        throw new Error('LLM 调用已被用户拒绝');
      }

      if (result.llmResponse) {
        return {
          role: this.role,
          content: result.llmResponse,
        };
      }
    }

    return this.callModel(opts);
  }

  async execute(context: Record<string, any>): Promise<AgentResult> {
    const systemPrompt = this.getSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(context);

    return this.callModelWithApproval({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
  }

  protected abstract buildUserPrompt(context: Record<string, any>): string;
}