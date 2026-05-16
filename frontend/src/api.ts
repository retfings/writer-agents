const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  
  let data: any;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`服务器错误 (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`);
  }

  return data;
}

// Auth
export const auth = {
  login: (username: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string, displayName: string) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName }),
    }),
  me: () => request<{ user: any }>('/me'),
};

// Projects
export const projects = {
  list: () => request<{ projects: any[] }>('/projects'),
  get: (id: string) => request<{ project: any }>(`/projects/${id}`),
  create: (data: { title: string; genre?: string; synopsis?: string; targetWords?: number; totalChapters?: number; modelProvider?: string }) =>
    request<{ project: any }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    request<{ project: any }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
  generateIdea: (prompt: string) =>
    request<{
      titles: string[];
      synopsis: string;
      fullSynopsis: string;
      genre: string;
      tags: string[];
      sellingPoints: string[];
      targetAudience: string;
      openingHook: string;
    }>('/projects/generate-idea', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),
};

// Chapters
export const chapters = {
  list: (projectId: string) =>
    request<{ chapters: any[] }>(`/chapters/project/${projectId}`),
  get: (id: string) => request<{ chapter: any }>(`/chapters/${id}`),
  generateOutline: (projectId: string) =>
    request<any>(`/chapters/${projectId}/generate-outline`, { method: 'POST' }),
  write: (projectId: string, chapterNumber: number, instructions?: string) =>
    request<any>(`/chapters/${projectId}/write`, {
      method: 'POST',
      body: JSON.stringify({ chapterNumber, instructions }),
    }),
  review: (id: string) =>
    request<any>(`/chapters/${id}/review`, { method: 'POST' }),
  rewrite: (id: string, instructions: string) =>
    request<any>(`/chapters/${id}/rewrite`, {
      method: 'POST',
      body: JSON.stringify({ instructions }),
    }),
  update: (id: string, data: any) =>
    request<{ chapter: any }>(`/chapters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/chapters/${id}`, { method: 'DELETE' }),
  deleteAll: (projectId: string) =>
    request<{ success: boolean; deleted: number }>(`/chapters/project/${projectId}/all`, { method: 'DELETE' }),
};

// Characters
export const characters = {
  list: (projectId: string) =>
    request<{ characters: any[] }>(`/characters/project/${projectId}`),
  create: (data: any) =>
    request<{ character: any }>('/characters', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    request<{ character: any }>(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/characters/${id}`, { method: 'DELETE' }),
};

// Export
export const exportApi = {
  txt: (projectId: string) => `${API_BASE}/export/project/${projectId}/txt`,
  html: (projectId: string) => `${API_BASE}/export/project/${projectId}/html`,
};

// Chat
export const chat = {
  history: (projectId: string) =>
    request<{ messages: any[] }>(`/chat/project/${projectId}/history`),
  clearHistory: (projectId: string) =>
    request<{ success: boolean }>(`/chat/project/${projectId}/history`, { method: 'DELETE' }),
  send: (projectId: string, message: string, chapterId?: string) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE}/chat/project/${projectId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message, chapterId }),
    });
  },
};

// Foreshadowing
export const foreshadowing = {
  list: (projectId: string) =>
    request<{ foreshadowing: any[] }>(`/foreshadowing/project/${projectId}`),
  create: (data: any) =>
    request<{ foreshadowing: any }>('/foreshadowing', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<{ foreshadowing: any }>(`/foreshadowing/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/foreshadowing/${id}`, { method: 'DELETE' }),
};

// World Notes
export const notes = {
  list: (projectId: string) =>
    request<{ notes: any[] }>(`/notes/project/${projectId}`),
  create: (data: any) =>
    request<{ note: any }>('/notes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<{ note: any }>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/notes/${id}`, { method: 'DELETE' }),
};

// Approvals
export const approvals = {
  listPending: (projectId: string) =>
    request<{ requests: any[] }>(`/approvals/project/${projectId}/pending`),
  get: (id: string) =>
    request<{ request: any }>(`/approvals/${id}`),
  approve: (id: string) =>
    request<{ success: boolean }>(`/approvals/${id}/approve`, { method: 'POST' }),
  reject: (id: string) =>
    request<{ success: boolean }>(`/approvals/${id}/reject`, { method: 'POST' }),
};

// Prompt Templates
export const promptTemplates = {
  list: () =>
    request<{ templates: any[] }>('/prompt-templates'),
  get: (id: string) =>
    request<{ template: any; versions: any[] }>(`/prompt-templates/${id}`),
  create: (data: { name: string; systemPrompt?: string; userPrompt?: string; isDefault?: boolean }) =>
    request<{ template: any }>('/prompt-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { name?: string; systemPrompt?: string; userPrompt?: string; isDefault?: boolean }) =>
    request<{ template: any }>(`/prompt-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/prompt-templates/${id}`, { method: 'DELETE' }),
  initDefaults: () =>
    request<{ templates: any[] }>('/prompt-templates/init-defaults', { method: 'POST' }),
};
