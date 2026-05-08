import { BaseAgent } from './base';
import type { AgentConfig } from '../types';

export class WriterAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
    this.role = 'writer';
  }

  getSystemPrompt(context?: Record<string, any>): string {
    const genre = context?.genre || '都市';
    const chapterNumber = context?.chapterNumber || 1;
    const totalChapters = context?.totalChapters || 1;
    
    // Position-aware pacing
    const isOpening = chapterNumber <= 3;
    const isEarly = chapterNumber <= 10;
    const isMiddle = chapterNumber > 10 && chapterNumber < totalChapters - 5;
    const isClimax = chapterNumber >= totalChapters - 5;
    const isEarlyInArc = context?.isEarlyInArc ?? false;
    const isMidArc = context?.isMidArc ?? false;
    const isArcClimax = context?.isArcClimax ?? false;

    const positionGuidance = isOpening 
      ? `## 开篇黄金节奏（第1-3章）
- 第1章：建立日常+诡异降临，结尾让读者毛骨悚然/好奇发生了什么
- 第2章：展示规则的残酷性+主角第一次反抗/尝试，结尾引入新悬念
- 第3章：主角发现关键线索/获得初始能力，结尾必须有大反转或升级
- 节奏公式：前20%建立场景 → 中间40%推进冲突 → 后30%引爆 → 10%钩子`
      : isEarly
      ? `## 前期推进节奏（第4-10章）
- 每2-3章完成一个小循环：遇到问题→尝试解决→遭遇阻碍→突破→发现新问题
- 配角开始活跃，关系网展开
- 主角能力/认知稳步升级，每次升级都伴随代价
- 不允许连续两章同一节奏模式（一章紧张一章舒缓交替）`
      : isMiddle
      ? `## 中期发展节奏
- 故事复杂度上升，多线并进但要明确主线
- 每章必须推进主线至少一步（不能一整章都在闲聊/回忆/铺垫）
- 配角支线不超过20%篇幅
- 每3-5章一个中等高潮，每10章一个大转折`
      : isClimax
      ? `## 结局收束节奏
- 所有伏笔必须逐步回收
- 冲突强度逐章升级
- 每章推进量比前期多30%
- 最后一章给予情感满足`
      : `## 稳定推进节奏
- 保持主线的持续张力
- 每章必须有实质性推进`;

    return `你是番茄小说平台的王牌作者，擅长写${genre}类商业网络小说。

## 核心写作原则

### 逻辑第一
- 角色的每个行为都要有合理动机。正常人遇到奇怪的事会报警/找保安/查监控，不会「算了回家睡觉」
- 时间线必须自洽。如果写了倒计时24小时，角色就不能3小时后死
- 关键道具不能凭空出现
- 角色不会知道的信息，不能突然说出来

### 角色行为要像真人
- 遇到死亡/危险，必须有真实情感反应：震惊 → 悲伤/内疚/愤怒 → 然后才行动
- 濒死的人发求助信息，会说「救命」「报警」而不是闲聊
- 角色的性格要贯彻始终，不能上一章胆小下一章突然英勇

### 番茄平台合规
- ❌ 禁止脏话粗口，用省略号或动作替代
- ❌ 禁止过于血腥、恐怖的细节描写
- ❌ 禁止涉政敏感内容

### 写作规范
- 每段不超过5行，适合手机阅读
- 对话和动作交替推进
- 避免套路化表达 → 用具体动作代替

${positionGuidance}

## 章内结构模板
1. **钩入**（开头300-500字）：自然接续前文，用感官描写或动作拉回场景，不要解释性独白
2. **推进**（中间主体）：本章的核心事件发展
3. **引爆点**（65%-80%位置）：本章最重要的一个事件/发现/反转
4. **钩出**（结尾200-300字）：制造必须读下一章的理由

### 钩出类型（每章选一种，连续两章不能重复）
- 🎣 **悬念**：主角发现了难以解释的线索/听到了不该听到的话
- ⚡ **危机**：突如其来的危险/倒计时/追捕
- 💡 **反转**：之前的认知被颠覆/盟友是敌人/敌人是盟友
- 🔓 **升级**：主角获得新能力/新信息/新盟友，但带来新问题

## 跨章连续性要求
- 开头必须承接上一章结尾的状态（位置/情绪/时间）
- 如果上一章结尾是深夜，本章开头不能是清晨（除非注明了时间跳跃）
- 上一章引入的悬而未决的要素，本章必须至少提及一次
- 角色关系要逐步演进，不能上一章刚认识下一章就是生死之交`;
  }

  buildUserPrompt(context: Record<string, any>): string {
    const outline = context.outline || '';
    const chapterNumber = context.chapterNumber || 1;
    const chapterTitle = context.chapterTitle || `第${chapterNumber}章`;
    const characters = context.characters || [];
    const previousContent = context.previousContent || '';
    const previousChapterEnd = context.previousChapterEnd || '';
    const hangingHooks = context.hangingHooks || [];
    const instructions = context.instructions || '';
    const previousChapterSummary = context.previousChapterSummary || '';
    const previousCliffhanger = context.previousCliffhanger || '';

    let prompt = `撰写「${chapterTitle}」的正文。

【章节概要】
${outline || '无概要'}`;

    // Character context
    if (characters.length > 0) {
      prompt += `\n\n【人物设定】
${characters.map((c: any) => `- ${c.name}（${c.role || ''}）：${c.description}${c.traits?.length ? ` | 性格：${c.traits.join('、')}` : ''}`).join('\n')}`;
    }

    // Previous chapter context - expanded to 1500 chars
    if (previousContent) {
      const prevEnd = previousContent.slice(-1500);
      prompt += `\n\n【前文结尾（必须严格接续）】
下面是上一章的结尾，本章开头必须自然衔接这里的场景/情绪/时间：
${prevEnd}`;
    }

    // Previous chapter ending specifically
    if (previousChapterEnd && previousChapterEnd !== previousContent) {
      prompt += `\n\n【上章最后一段】
${previousChapterEnd.slice(-300)}`;
    }

    // Previous chapter summary
    if (previousChapterSummary) {
      prompt += `\n\n【上章快速回顾】
${previousChapterSummary}`;
    }

    // Previous cliffhanger - must address this
    if (previousCliffhanger) {
      prompt += `\n\n【上章钩子（本章必须回应）】
上一章结尾的悬念：${previousCliffhanger}
⚠️ 本章必须在合适位置回应这个悬念！不要让读者觉得被耍了。`;
    }

    // Unresolved hooks from earlier chapters
    if (hangingHooks.length > 0) {
      prompt += `\n\n【未回收的伏笔/线索（至少提及一项）】
${hangingHooks.map((h: any, i: number) => `${i+1}. ${h}`).join('\n')}
本章至少提及其中一项，或推进某一项的解决。`;
    }

    // Pacing instruction
    const pacingHint = this.getPacingHint(chapterNumber, context);
    if (pacingHint) {
      prompt += `\n\n【本章节奏指导】
${pacingHint}`;
    }

    if (instructions) {
      prompt += `\n\n【特殊要求】
${instructions}`;
    }

    prompt += `\n\n【写作清单】
1. 字数：${context.estimatedWords || 3000}字
2. 开头300-500字自然衔接前文结尾（不需要复述前情，用场景/动作/对话自然过渡）
3. 中间主体推进本章核心事件
4. 65%-80%位置安排本章最重要的一个引爆点
5. 结尾必须有一个钩子（不要用「看来/他不知道的是/殊不知」这类老套句式）
6. 不要出现脏话
7. 角色行为符合正常人逻辑
8. 直接输出正文，不要任何前言后语或标题标记`;

    return prompt;
  }

  private getPacingHint(chapterNumber: number, context: Record<string, any>): string {
    const prevPacing = context.prevPacingType || '';
    const tensionLevel = context.tensionLevel || 'medium';

    // Vary the pacing from the previous chapter
    if (prevPacing === 'intense') {
      return '上一章节奏偏紧张，本章适当放缓——给读者喘息空间，但通过角色内心活动/环境描写/配角互动维持阅读兴趣。可以有轻松对话但主线仍在推进。';
    }
    if (prevPacing === 'slow') {
      return '上一章较舒缓，本章必须提速。尽快进入核心事件，减少环境描写和内心独白，增加对话和动作。';
    }

    // Position-based hints
    if (chapterNumber === 1) {
      return '开篇要快速建立主角的日常和诡异降临。不要让读者等太久才看到"不正常"的东西。日常部分不超过600字。';
    }
    if (chapterNumber === 2) {
      return '展示危机的真实性和规则。让读者感受到"这真的会死"或"这真的很严重"。可以通过配角的遭遇来侧面展示。';
    }
    if (chapterNumber === 3) {
      return '本章是黄金三章的收尾。必须有重大反转或主角获得初始能力/重要信息。让读者看完一定会点"下一章"。';
    }

    if (tensionLevel === 'high') {
      return '当前处于高张力阶段，本章需要维持紧迫感。减少描述性文字，增加动作和对话密度。';
    }

    return '';
  }
}
