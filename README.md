# NovelFlow — 番茄小说 AI 写作平台

[![GitHub](https://img.shields.io/badge/github-retfings%2Fwriter--agents-orange)](https://github.com/retfings/writer-agents)

面向商业网文创作者的全栈 AI 辅助写作平台。三栏布局，沉浸式编辑，AI 流式对话。

## 功能

- **三栏布局** 大纲/人物/伏笔/笔记 → 章节阅读 → AI 对话
- **沉浸式编辑器** Markdown 快捷键、自动保存（2/3/5/10s 可配）、专注模式
- **AI 写作辅助** SSE 流式对话、一章到底写作、审校润色、改写
- **创作管理** 人物卡片、伏笔追踪、世界观笔记、章节导航
- **多主题** 日间/夜间/护眼，字号 12–24px 可调

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Tailwind CSS + Vite |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | SQLite (better-sqlite3) |
| AI | DeepSeek API (可扩展 OpenAI/Anthropic/Gemini) |
| 部署 | Nginx 反代 + systemd |

## 快速开始

### 环境要求

- Node.js ≥ 22
- npm ≥ 10

### 安装

```bash
git clone https://github.com/retfings/writer-agents.git
cd writer-agents
cp .env.example .env  # 配置 API keys

# 后端
cd backend && npm install && npm run build

# 前端
cd frontend && npm install && npm run build
```

### 运行

```bash
# 后端 (默认 :3001)
cd backend && node dist/index.js

# 前端开发
cd frontend && npm run dev
```

### 部署

```bash
# 构建并部署到 Nginx
cd frontend && npm run build  # postbuild 自动部署到 /var/www/novelflow
sudo systemctl restart novelflow
```

## 项目结构

```
writer-agents/
├── backend/
│   ├── src/
│   │   ├── agents/        # AI Agent (planner/writer/editor/character)
│   │   ├── routes/        # API 路由 (auth/chapters/chat/...)
│   │   ├── db/            # SQLite schema & init
│   │   ├── middleware/    # JWT auth
│   │   └── index.ts       # Express entry
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/      # AIChatPanel
│   │   │   ├── layout/    # ThreeColumnLayout
│   │   │   ├── reader/    # ChapterContent/ChapterNav/ReadingToolbar
│   │   │   └── sidebar/   # OutlineTree/CharacterPanel/...
│   │   ├── pages/         # Dashboard/Login/ProjectDetail
│   │   ├── api.ts         # HTTP client
│   │   └── types.ts       # 前端类型
│   └── package.json
├── nginx.conf
└── shared/types.ts
```

## API

| 端点 | 说明 |
|---|---|
| `POST /api/auth/register` | 注册 |
| `POST /api/auth/login` | 登录 |
| `GET /api/projects` | 项目列表 |
| `POST /api/projects` | 创建项目 |
| `GET /api/chapters/project/:id` | 章节列表 |
| `PUT /api/chapters/:id` | 更新章节 |
| `POST /api/chapters/:id/write` | AI 写作一章 |
| `POST /api/chapters/:id/rewrite` | AI 改写 |
| `POST /api/chat/stream` | SSE 流式对话 |
| `GET /api/characters/project/:id` | 人物列表 |
| `GET /api/foreshadowing/project/:id` | 伏笔列表 |
| `GET /api/notes/project/:id` | 笔记列表 |

## License

MIT
