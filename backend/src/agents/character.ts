import { BaseAgent } from './base';
import type { AgentConfig, Character, CharacterRelation } from '../types';

export class CharacterAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
    this.role = 'character';
  }

  getSystemPrompt(context?: Record<string, any>): string {
    return `你是番茄小说平台的"人物总监"，负责管理和维护小说中所有角色的设定、发展和关系。

你的核心职责：
1. **人设管理**：为每个角色建立详细的人物档案
2. **人设一致性**：在每章写作前提供角色行为指引，确保角色行为符合其设定
3. **角色弧线**：追踪角色成长轨迹，确保角色有合理的转变过程
4. **关系网络**：维护角色之间的关系图谱
5. **冲突设计**：基于角色性格和动机，建议合理的角色冲突

输出格式（JSON格式）：
{
  "characters": [...],
  "consistency_checks": [...],
  "development_notes": [...],
  "scene_advice": "..."
}`;
  }

  buildUserPrompt(context: Record<string, any>): string {
    if (context.task === 'create_character') {
      return `请为小说创建一个新角色，填入以下信息：
- 角色定位：${context.characterRole || '配角'}
- 性别：${context.gender || '男'}
- 大致年龄：${context.age || '青年'}
- 与主角关系：${context.relationToMC || '待定'}
      
请输出详细的人物档案，包括：姓名、性格特征、外貌、背景故事、动机、成长弧线。`;
    }

    if (context.task === 'consistency_check') {
      const content = context.content || '';
      const characters = context.characters || [];
      return `请检查以下章节内容中的人物行为是否符合设定：

【人物设定】
${characters.map((c: any) => `- ${c.name}：${c.description}（性格：${c.traits?.join('、') || ''}）`).join('\n')}

【待检查章节】
${content.slice(0, 5000)}

请指出任何人设不一致的地方，并提供修正建议。`;
    }

    if (context.task === 'scene_cast') {
      return `以下章节即将出现哪些角色？请基于剧情需要列出应出现的角色及其出场方式和作用：
      
章节概要：${context.outline || ''}
已知角色：${JSON.stringify(context.characters || [])}`;
    }

    return `人物管理任务：${JSON.stringify(context)}`;
  }
}
