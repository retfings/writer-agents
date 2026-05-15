import type {
  AgentConfig, AgentResult, WriteRequest, WriteResult,
  WriteResult as WriteResultType, ChapterOutline, Character
} from '../types';

import { PlannerAgent } from './planner';
import { WriterAgent } from './writer';
import { EditorAgent } from './editor';
import { CharacterAgent } from './character';
import { BaseAgent } from './base';

export class AgentOrchestrator {
  private planner: PlannerAgent;
  private writer: WriterAgent;
  private editor: EditorAgent;
  private character: CharacterAgent;
  private approvalContext: { projectId?: string; userId?: string; approvalMode?: 'auto' | 'manual' } = {};

  constructor(configs: AgentConfig[]) {
    const getConfig = (role: string) => {
      const c = configs.find(c => c.role === role);
      if (!c) throw new Error(`Agent config not found for role: ${role}`);
      return c;
    };

    this.planner = new PlannerAgent(getConfig('planner'));
    this.writer = new WriterAgent(getConfig('writer'));
    this.editor = new EditorAgent(getConfig('editor'));
    this.character = new CharacterAgent(getConfig('character'));
  }

  setApprovalContext(ctx: { projectId?: string; userId?: string; approvalMode?: 'auto' | 'manual' }): void {
    this.approvalContext = ctx;
    const agents: BaseAgent[] = [this.planner, this.writer, this.editor, this.character];
    for (const agent of agents) {
      agent.setApprovalContext(ctx);
    }
  }

  async generateOutline(context: {
    genre: string;
    synopsis: string;
    targetWords: number;
    totalChapters?: number;
  }): Promise<{ outline: string; chapters: ChapterOutline[] }> {
    // Use specified chapter count or calculate from word count
    const totalChapters = Math.min(context.totalChapters || Math.ceil(context.targetWords / 3000), 1000);
    
    const result = await this.planner.execute({
      task: 'outline',
      genre: context.genre,
      synopsis: context.synopsis,
      targetWords: Math.min(context.targetWords, 1500000),
      totalChapters,
    });

    // Safety: truncate very large responses
    const content = result.content.slice(0, 200000);

    // Calculate words per chapter
    const wordsPerChapter = Math.round(context.targetWords / totalChapters);

    // Parse and deduplicate
    let chapters = this.parseOutlineToChapters(content, wordsPerChapter);
    
    // Remove duplicate titles
    const seen = new Set<string>();
    chapters = chapters.filter(ch => {
      const key = ch.title.trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Renumber
    chapters.forEach((ch, i) => { ch.number = i + 1; });

    const final = chapters.slice(0, totalChapters);
    const fullOutline = final.map(c => `第${c.number}章 ${c.title}\n${c.summary}`).join('\n\n');

    return { outline: fullOutline, chapters: final };
  }

  async planChapter(context: {
    chapterNumber: number;
    volumeInfo: string;
    previousSummary: string;
    activeCharacters: string[];
    estimatedWords: number;
  }): Promise<AgentResult> {
    return this.planner.execute({ task: 'chapter_plan', ...context });
  }

  async writeChapter(req: WriteRequest): Promise<WriteResultType> {
    const results: AgentResult[] = [];

    // Step 1: Character Agent - provide character guidance for this chapter
    const charResult = await this.character.execute({
      task: 'scene_cast',
      outline: req.outline?.summary || '',
      characters: req.characters || [],
    });
    results.push(charResult);

    // Step 2: Writer Agent - generate the content
    const writeResult = await this.writer.execute({
      chapterNumber: req.chapterNumber,
      chapterTitle: req.outline?.title || `第${req.chapterNumber}章`,
      outline: req.outline?.summary || '',
      characters: req.characters || [],
      previousContent: req.previousContent || '',
      previousChapterEnd: req.previousChapterEnd || '',
      previousChapterSummary: req.previousChapterSummary || '',
      previousCliffhanger: req.previousCliffhanger || '',
      hangingHooks: req.hangingHooks || [],
      style: req.style || '快节奏爽文',
      estimatedWords: req.outline?.estimatedWords || 3000,
      instructions: req.instructions || '',
      ...(req.pacingContext || {}),
    });
    results.push(writeResult);

    // Step 3: Editor Agent - review and polish
    const editResult = await this.editor.execute({
      content: writeResult.content,
      chapterNumber: req.chapterNumber,
      genre: '都市',
      characters: req.characters || [],
    });
    results.push(editResult);

    const wordCount = this.countChineseChars(writeResult.content);

    return {
      chapterId: `ch-${req.projectId}-${req.chapterNumber}`,
      content: writeResult.content,
      agentResults: results,
      wordCount,
    };
  }

  async reviewChapter(context: {
    content: string;
    chapterNumber: number;
    genre: string;
    characters: Character[];
  }): Promise<AgentResult> {
    return this.editor.execute({
      content: context.content,
      chapterNumber: context.chapterNumber,
      genre: context.genre,
      characters: context.characters,
    });
  }

  async rewriteChapter(params: {
    chapterNumber: number;
    chapterTitle: string;
    originalContent: string;
    outline: string;
    previousContent: string;
    characters: Character[];
    instructions: string;
    style?: string;
  }): Promise<WriteResultType> {
    const results: AgentResult[] = [];

    const writeResult = await this.writer.execute({
      chapterNumber: params.chapterNumber,
      chapterTitle: params.chapterTitle,
      outline: params.outline || '',
      characters: params.characters || [],
      previousContent: params.previousContent || '',
      style: params.style || '快节奏爽文',
      estimatedWords: this.countChineseChars(params.originalContent) || 3000,
      instructions: `【重写指令——必须严格遵循】\n${params.instructions}\n\n【原有版本——供参考，请在此基础上改进而非完全推翻】\n${params.originalContent.slice(0, 3000)}`,
    });
    results.push(writeResult);

    const editResult = await this.editor.execute({
      content: writeResult.content,
      chapterNumber: params.chapterNumber,
      genre: '都市',
      characters: params.characters || [],
    });
    results.push(editResult);

    const wordCount = this.countChineseChars(writeResult.content);

    return {
      chapterId: '',
      content: writeResult.content,
      agentResults: results,
      wordCount,
    };
  }

  async checkCharacterConsistency(context: {
    content: string;
    characters: Character[];
  }): Promise<AgentResult> {
    return this.character.execute({
      task: 'consistency_check',
      content: context.content,
      characters: context.characters,
    });
  }

  private parseOutlineToChapters(outline: string, startNumber: number = 1, wordsPerChapter: number = 3000): ChapterOutline[] {
    const chapters: ChapterOutline[] = [];

    // First pass: split by "第N章" markers
    const parts = outline.split(/\n(?=第\d+章[：:\s])/);

    for (const part of parts) {
      const headerMatch = part.match(/^第(\d+)章[：:\s]+(.+)/);
      if (!headerMatch) continue;

      const num = parseInt(headerMatch[1]);
      const rawTitle = headerMatch[2].trim();

      // Skip metadata-like lines
      if (/^(#{1,4}\s|\*\*|【|[《]|\d+-\d+章|卷[：:]|第\d+卷|概要|冲突|钩子|人物|字数|关键|核心|能力|成长|情感)/.test(rawTitle)) continue;
      if (rawTitle.length < 3 || rawTitle.length > 100) continue;

      const title = rawTitle.replace(/^[#>\-\s]+|[#>\-\s]+$/g, '').trim();

      // Extract summary from the rest of the block
      const body = part.slice(headerMatch[0].length);
      const summaryMatch = body.match(/>\s*(.+)/);
      const summary = (summaryMatch ? summaryMatch[1].trim() : body.trim().slice(0, 500)).slice(0, 500);

      chapters.push({
        number: num,
        title: title.slice(0, 80),
        summary,
        keyEvents: [],
        characters: [],
        povCharacter: '',
        estimatedWords: wordsPerChapter,
      });
    }

    if (chapters.length === 0) {
      const lines = outline.split('\n').filter(l => l.trim().length > 15);
      lines.forEach((line, i) => {
        chapters.push({
          number: i + 1,
          title: line.trim().slice(0, 60),
          summary: line.trim().slice(0, 500),
          keyEvents: [],
          characters: [],
          povCharacter: '',
          estimatedWords: wordsPerChapter,
        });
      });
    }

    return chapters;
  }

  private countChineseChars(text: string): number {
    const chineseChars = text.match(/[\u4e00-\u9fff]/g);
    const otherChars = text.replace(/[\u4e00-\u9fff]/g, '').match(/[a-zA-Z0-9]/g);
    return (chineseChars?.length || 0) + (otherChars?.length || 0);
  }
}
