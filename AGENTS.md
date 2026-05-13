# AGENTS.md — AI Coding Guidelines for NovelFlow

## Project Identity

- **Name**: NovelFlow (writer-agents)
- **Type**: Full-stack AI-assisted novel writing platform
- **Target**: Commercial web novel authors (番茄小说 style)
- **Language**: zh-CN (UI & comments)
- **Server**: Tencent Cloud Lighthouse, Vite dev server

## Architecture Rules

### Frontend (React + TypeScript + Tailwind + Vite)

- Components in `src/components/{category}/`
- Pages in `src/pages/`
- API client in `src/api.ts` — all HTTP calls go through here
- Types shared between frontend/backend in `shared/types.ts`
- No inline styles; use Tailwind classes exclusively
- Mobile: min touch target 36px, use `min-h-*` for buttons
- Three reading themes: light/dark/sepia, persisted to localStorage
- User preferences (fontSize, theme, autoSaveInterval) → localStorage

### Backend (Express + TypeScript + SQLite)

- Routes in `src/routes/`, one file per resource
- DB schema in `src/db/index.ts` → `initSchema()` called on startup
- AI agents in `src/agents/` — extend `BaseAgent`
- Auth: JWT, middleware in `src/middleware/auth.ts`
- SSE streaming: `text/event-stream` + `X-Accel-Buffering: no`
- All API responses: `{ success: boolean, data?: T, error?: string }`

### Database (SQLite via better-sqlite3)

Tables: `users`, `projects`, `chapters`, `characters`, `foreshadowing`, `world_notes`, `chat_messages`

Never query DB directly from frontend; always go through API routes.

## Deployment

### Docker 部署（推荐）

```bash
# 1. 进入 docker 目录
cd docker

# 2. 构建镜像
docker build -t novelflow .

# 3. 运行容器（需先配置 .env）
docker run -d -p 80:80 --name novelflow \
  --env-file .env \
  novelflow
```

### 传统部署

```bash
# Build backend
cd backend && npm run build

# Start services
systemctl restart novelflow       # backend on :3000
systemctl restart openclaw-gateway  # if needed

# Start frontend (dev mode, port 80)
cd frontend && npm run dev
```

Frontend runs directly on port 80 via Vite dev server. API proxy to backend `:3000`.

Docker 镜像架构：Nginx（静态文件 + API 代理） + Node.js（后端 API）

### Git Push Rule

**After every code change**, commit and push via subagent:

```bash
cd /root/novelflow && git push --no-thin origin master
```

⚠️ `--no-thin` is required to avoid OOM on 2GB servers.

## Code Style

- Components: named exports preferred for shared, default for page-level
- State: hooks at top, effects after
- Error handling: try/catch in async handlers, surface to user
- Comments: Chinese for domain logic, English for technical details
- No `any` in TypeScript unless absolutely necessary (add `// eslint-disable-next-line`)

## Key Decisions

1. Three-column layout with draggable dividers (left: 280px, right: 360px default)
2. Direct textarea editing — no edit/view mode toggle
3. Auto-save: debounced (configurable 2/3/5/10s), Ctrl+S for manual
4. Focus mode: hides sidebars, Esc to exit
5. AI chat: SSE streaming, context-aware (chapter + project)
6. DeepSeek V4 Pro as default model; provider-switchable planned

## Adding Features

When adding new features:
1. Backend: add route → register in `src/index.ts` → add DB table if needed
2. Frontend: add component → wire in page → update `api.ts`
3. After verifying locally: `npm run build`, confirm deployment, commit + push
