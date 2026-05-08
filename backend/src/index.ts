import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import chapterRoutes from './routes/chapters';
import characterRoutes from './routes/characters';
import exportRoutes from './routes/export';
import chatRoutes from './routes/chat';
import foreshadowingRoutes from './routes/foreshadowing';
import notesRoutes from './routes/notes';
import { authMiddleware } from './middleware/auth';
import { logger } from './logger';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Trust proxy (required behind nginx)
app.set('trust proxy', 1);

// Security
app.use(helmet({
  contentSecurityPolicy: false, // Allow frontend assets
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
});
app.use('/api/', limiter);

// Logging
app.use(morgan('short'));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// API Routes (auth's /register and /login don't need middleware; /me does)
app.use('/api/auth', authRoutes);
app.get('/api/me', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const { getDb } = require('./db');
  const db = getDb();
  const u = db.prepare('SELECT id, username, display_name, created_at FROM users WHERE id = ?').get(user.id) as any;
  if (!u) return res.status(404).json({ error: '用户不存在' });
  res.json({ user: { id: u.id, username: u.username, displayName: u.display_name, createdAt: u.created_at } });
});
app.use('/api/projects', projectRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/foreshadowing', foreshadowingRoutes);
app.use('/api/notes', notesRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`🦞 NovelFlow API running on http://localhost:${PORT}`);
  console.log(`   Frontend served from: ${frontendDist}`);
  console.log(`   DeepSeek API: ${process.env.DEEPSEEK_API_KEY ? '✅ configured' : '❌ not configured'}`);
});

export default app;
