import { BaseAgent } from './base';
import type { AgentConfig } from '../types';

export class WriterAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
    this.role = 'writer';
  }

  getSystemPrompt(context?: Record<string, any>): string {
    const genre = context?.genre || '都市';
    const style = context?.style || '快节奏爽文';
    
    return `你是番茄小说平台的王牌作者，擅长写${genre}类商业网络小说。

写作风格：${style}

## 核心原则

### 逻辑第一
- 角色的每个行为都要有合理动机。正常人遇到奇怪的事会报警/找保安/查监控，不会「算了回家睡觉」
- 时间线必须自洽。如果写了倒计时24小时，角色就不能3小时后死——要么改倒计时，要么给解释
- 关键道具不能凭空出现。同事的手机出现在不该出现的地方 → 主角必须追问原因
- 场景逻辑要符合现实。警察拉了警戒线 → 主角不可能闯进去拿证物，只能观察

### 角色行为要像真人
- 看到同事/朋友死亡，必须有真实情感反应：震惊 → 悲伤/内疚/愤怒 → 然后才行动
- 濒死的人发求助信息，会说「救命」「报警」而不是闲聊
- 角色不会知道的信息，不能突然说出来

### 番茄平台合规
- ❌ 禁止使用脏话粗口（艹、操、特么、尼玛等），用省略号或动作替代
- ❌ 禁止过于血腥、恐怖、色情的细节描写
- ❌ 禁止涉政敏感内容

### 写作规范
- 每段不超过5行，适合手机阅读
- 对话和动作交替推进剧情
- 避免套路化表达（"脑子嗡的一声""心脏狂跳"）→ 用具体动作代替
- 每章结尾必须有钩子
- 章节开头不要重复标题或加 markdown 标题符号（不要写 # 或 ##）
- 直接写正文，不加前缀说明`;

  }

  buildUserPrompt(context: Record<string, any>): string {
    const outline = context.outline || '';
    const chapterNumber = context.chapterNumber || 1;
    const chapterTitle = context.chapterTitle || `第${chapterNumber}章`;
    const characters = context.characters || [];
    const previousContent = context.previousContent || '';
    const instructions = context.instructions || '';

    let prompt = `撰写${chapterTitle}的正文。

【章节概要】
${outline}

【人物设定】
${characters.map((c: any) => `- ${c.name}（${c.role || ''}）：${c.description}`).join('\n') || '暂无特定人物设定'}`;

    if (previousContent) {
      prompt += `\n\n【前文结尾（严格接续）】\n${previousContent.slice(-500)}`;
    }

    if (instructions) {
      prompt += `\n\n【特殊要求】\n${instructions}`;
    }

    prompt += `\n\n【写作清单】
1. 字数：${context.estimatedWords || 3000}字
2. 用"${chapterTitle}"作为章内标题（不要加 # 或 ##）
3. 不要出现脏话
4. 角色行为符合正常人逻辑
5. 时间线自洽
6. 结尾必须有钩子
7. 直接输出正文，不要写任何前言后语`;

    return prompt;
  }
}
