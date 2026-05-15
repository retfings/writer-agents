// ========== NovelFlow Shared Types ==========

export type ModelProvider = 'deepseek' | 'openai' | 'claude' | 'qwen';
export type AgentRole = 'planner' | 'writer' | 'editor' | 'character' | 'orchestrator';
export type NovelGenre = 'urban' | 'fantasy' | 'xianxia' | 'scifi' | 'historical' | 'romance' | 'suspense';
export type ProjectStatus = 'draft' | 'writing' | 'completed' | 'published';
export type ChapterStatus = 'outline' | 'draft' | 'review' | 'done';
export type ApprovalMode = 'auto' | 'manual';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  projectId: string;
  userId: string;
  agentType: AgentRole;
  systemPrompt: string;
  userPrompt: string;
  status: ApprovalStatus;
  llmResponse?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentConfig {
  role: AgentRole;
  model: ModelConfig;
  systemPrompt: string;
  temperature?: number;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  genre: NovelGenre;
  synopsis: string;
  targetWords: number;
  totalChapters?: number;
  status: ProjectStatus;
  agentConfig: AgentConfig[];
  approvalMode: ApprovalMode;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  projectId: string;
  number: number;
  title: string;
  outline: string;
  content: string;
  wordCount: number;
  status: ChapterStatus;
  characters: string[];
  keyEvents: string[];
  agentNotes: AgentNote[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentNote {
  role: AgentRole;
  content: string;
  timestamp: string;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  role: string;
  description: string;
  traits: string[];
  relationships: CharacterRelation[];
  arc: string;
}

export interface CharacterRelation {
  withName: string;
  relation: string;
  dynamic: string;
}

export interface ChapterOutline {
  number: number;
  title: string;
  summary: string;
  keyEvents: string[];
  characters: string[];
  povCharacter: string;
  estimatedWords: number;
}

export interface WriteRequest {
  projectId: string;
  chapterNumber: number;
  outline?: ChapterOutline;
  previousContent?: string;
  characters?: Character[];
  style?: string;
  instructions?: string;
}

export interface AgentResult {
  role: AgentRole;
  content: string;
  metadata?: Record<string, any>;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface WriteResult {
  chapterId: string;
  content: string;
  agentResults: AgentResult[];
  wordCount: number;
}

export interface ExportRequest {
  projectId: string;
  format: 'txt' | 'html' | 'epub';
  chapters?: string[];
}
