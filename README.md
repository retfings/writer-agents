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
| 部署 | Docker + Nginx |

## 快速开始

### 环境要求

- Node.js ≥ 22
- npm ≥ 10

### 安装

```bash
git clone https://github.com/retfings/writer-agents.git
cd writer-agents
cp .env.example .env  # 配置 API keys

```

### 运行

```bash
# 后端 (默认 :3000),如果已经 npm run dev 不要重复执行 （dev mode ,port 3000)
cd backend && nohup npm run dev < /dev/null > app.log 2>&1

# 前端 (直接运行在 80 端口)
cd frontend && nohup npm run dev < /dev/null > app.log 2>&1
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
├── docker/
│   ├── Dockerfile         # 多阶段构建镜像
│   ├── nginx.conf         # Nginx 配置
│   ├── start.sh           # 启动脚本
│   └── .dockerignore
└── shared/types.ts
```

## Docker 部署（推荐）

使用 Docker 一键部署到 `writer.kangyuetech.cn`

### 环境要求

- Docker ≥ 20.10
- Docker Compose ≥ 2.0（可选）

### 构建并运行

```bash
# 1. 进入 docker 目录
cd docker

# 2. 创建 .env 文件
cp ../.env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY 和 JWT_SECRET

# 3. 构建镜像
docker build -t novelflow .

# 4. 运行容器
docker run -d -p 80:80 --name novelflow \
  --env-file .env \
  novelflow
```

### 使用 Docker Compose

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "80:80"
    env_file:
      - .env
    restart: unless-stopped
```

```bash
docker compose up -d
```

### 环境变量说明

| 变量 | 必填 | 说明 |
|---|---|---|
| `OPENAI_API_KEY` | 是 | DeepSeek API Key |
| `JWT_SECRET` | 是 | JWT 签名密钥 |
| `OPENAI_BASE_URL` | 否 | API 地址，默认 `https://api.deepseek.com` |
| `CORS_ORIGIN` | 否 | CORS 允许的源，默认 `http://writer.kangyuetech.cn` |

### 访问

部署后访问 `http://writer.kangyuetech.cn`（需配置 DNS 解析到服务器 IP）

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
