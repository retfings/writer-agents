import { BaseAgent } from './base';
import type { AgentConfig } from '../types';

export class PlannerAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
    this.role = 'planner';
  }

  getSystemPrompt(context?: Record<string, any>): string {
    const genre = context?.genre || '都市';
    const targetWords = context?.targetWords || 1000000;
    const synopsis = context?.synopsis || '';
    
    return `你是番茄小说平台的资深策划编辑，专门策划${genre}类商业网络小说。

你的核心职责：
1. **大纲策划**：基于故事梗概，设计完整的小说大纲，包括分卷结构、主线剧情、支线剧情
2. **章节规划**：为每章设计详细的章节概要，包括：事件、冲突、人物出场、情绪节奏
3. **爽点设计**：确保每3-5章有一个小高潮，每20章有一个大高潮，符合网络文学读者的阅读节奏
4. **商业化思维**：考虑番茄小说的推荐机制（追读率、完读率），让开头3章足够抓人

写作规范：
- 目标字数：${targetWords.toLocaleString()}字
- 每章2000-4000字
- 开头必须有"黄金三章"（前3章必须制造强冲突或悬念）
- 每章结尾留钩子（悬念/反转/期待）

故事梗概：${synopsis}

输出格式：用清晰的结构化文字，分卷、分章节详细描述。`;
  }

  buildUserPrompt(context: Record<string, any>): string {
    if (context.task === 'outline') {
      return `请为小说规划详细大纲。
      
故事梗概：${context.synopsis || '请根据你已知的信息规划'}
目标总字数：${context.targetWords || 1000000}字 约${context.totalChapters || 333}章
类型：${context.genre || '都市'}

必须严格按以下格式输出，每章一行，不要加任何其他内容：

第1章：具体的章节标题
> 本章概要（30-80字，包含核心事件和冲突）

第2章：具体的章节标题
> 本章概要

第3章：具体的章节标题
> 本章概要

...依次列出所有章节

重要规则：
1. 章节标题必须独一无二、具体有辨识度（如"深夜的第七个包裹"而不是"新的开始"）
2. 不要写卷信息、角色介绍等元数据，只输出章节
3. 每章标题后紧跟 > 开头的概要行
4. 前3章必须包含强钩子（黄金三章）
5. 不要使用markdown标题（# ##），直接用"第X章：标题"格式`;
    }

    if (context.task === 'chapter_plan') {
      return `请为第${context.chapterNumber}章设计详细的章节概要：
      
当前卷信息：${context.volumeInfo || '第一卷'}
前一章内容概要：${context.previousSummary || '无（这是开头章节）'}
出场人物：${context.activeCharacters || '待定'}

要求：
1. 本章核心事件（1-2个关键事件）
2. 冲突设计（人物冲突/环境冲突/内心冲突）
3. 情绪曲线（从什么情绪到行么情绪）
4. 结尾钩子（留下什么悬念/期待）
5. 预计字数：${context.estimatedWords || 3000}字`;
    }

    return `规划任务：${JSON.stringify(context)}`;
  }
}
