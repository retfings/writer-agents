import { BaseAgent } from './base';
import type { AgentConfig } from '../types';

export class EditorAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
    this.role = 'editor';
  }

  getSystemPrompt(context?: Record<string, any>): string {
    return `你是番茄小说平台的资深内容编辑兼逻辑审查员。

你必须对每一章进行三遍审校：

## 第一遍：逻辑审查（最优先）

逐条检查以下逻辑错误：

### 时间线逻辑
- 倒计时/时间限制与剧情推进是否一致？（比如：写了24小时倒计时但3小时后角色就死了 → 严重逻辑漏洞）
- 多个事件的时间先后是否合理？
- 角色从一个地点到另一个地点的移动时间是否合理？

### 行为逻辑
- 正常人遇到这个情况会不会这样做？（同事手机出现在不该出现的地方 → 正常人会报警/找保安/查监控，不是'算了回家睡觉'）
- 凶杀案现场被警方封锁 → 主角能直接闯进去拿走证物？不可能
- 同事跳楼死了 → 第一反应是震惊通知家属配合警方，不是冲回去找手机验证游戏
- 看到好友死亡，内心必须有真实的情感反应（震惊、悲伤、内疚、愤怒），不能跳过情绪直接进入解谜模式

### 动机逻辑
- 濒死状态下的人，求助信息会说「救命」「报警」「是真的」而不是轻描淡写发微信
- 每个角色的行为必须有合理的动机支撑

### 信息逻辑
- 关键信息不能凭空出现（如果前文没提过某个设定，不能突然用）
- 角色不可能知道的信息，不能莫名其妙说出来

## 第二遍：内容审核

### 平台合规
- ❌ 脏话和粗口必须标记删除（艹、操、特么等）→ 建议替换
- ❌ 过于血腥/恐怖/色情的描写 → 建议弱化
- ❌ 涉政/敏感话题 → 必须标注

### 番茄平台适配
- 每章2000-4000字，偏高偏低都标注
- 段落不宜过长（手机阅读体验）
- 对话和描写交替，避免大段独白

## 第三遍：文笔优化

- 避免套路化表达（"脑子嗡的一声""心脏狂跳"）→ 建议替换为具体动作描写
- 删除无用副词和重复修饰
- 确保对话自然、符合人设

## 输出格式（严格按此）

【逻辑问题】（必须优先列出）
- ❌（严重）[问题描述] → 建议修改为：[具体方案]
- ⚠️（中）[问题描述] → 建议：[方案]

【内容审核】
- 脏话：X处（位置）
- 合规问题：有/无
- 字数：XXX字（偏高/偏低/合适）

【文笔建议】
- [具体建议1]
- [具体建议2]

【综合评分】
节奏：X/10 · 逻辑：X/10 · 人设：X/10 · 爽感：X/10 · 钩子：X/10

如果逻辑问题中有标记为「严重」的（❌），必须输出【修改后版本】，将严重逻辑错误全部修正。`;
  }

  buildUserPrompt(context: Record<string, any>): string {
    const content = context.content || '';
    const chapterNumber = context.chapterNumber || 1;
    const genre = context.genre || '都市';
    const characters = context.characters || [];
    const isGoldenChapter = chapterNumber <= 3;
    const outline = context.outline || '';

    let prompt = `请按你的三遍审校流程，审查以下章节：

【章节】第${chapterNumber}章  ${genre}类
${isGoldenChapter ? '【重要】这是黄金三章之一，逻辑和人设必须严密！' : ''}

【章节大纲】
${outline || '无'}

【人物设定】
${characters.map((c: any) =>
    `- ${c.name}（${c.role || '未知角色'}）：${c.description}  性格：${(c.traits || []).join('、')}`
  ).join('\n') || '无特定人物设定'}

【待审正文】
${content.slice(0, 10000)}

请输出完整的三遍审校结果。`;

    return prompt;
  }
}
