import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { generateToken, authMiddleware } from '../middleware/auth';
import { logger } from '../logger';

const router = Router();

function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

router.post('/register', (req: Request, res: Response) => {
  const { username, password, displayName } = req.body;
  const ip = getClientIp(req);
  
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: '密码至少6位' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    logger.auth.registerDuplicate(username, ip);
    res.status(409).json({ error: '用户名已存在' });
    return;
  }

  const id = uuid();
  const hash = bcrypt.hashSync(password, 10);
  
  db.prepare('INSERT INTO users (id, username, password_hash, display_name) VALUES (?, ?, ?, ?)')
    .run(id, username, hash, displayName || username);

  logger.auth.register(username, ip, id);

  const token = generateToken({ id, username });
  res.json({ token, user: { id, username, displayName: displayName || username } });
});

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const ip = getClientIp(req);
  
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logger.auth.loginFail(username, ip, '用户名或密码错误');
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  logger.auth.loginSuccess(username, ip, user.id);

  const token = generateToken({ id: user.id, username: user.username });
  res.json({ token, user: { id: user.id, username: user.username, displayName: user.display_name } });
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const ip = getClientIp(req);
  const db = getDb();
  const u = db.prepare('SELECT id, username, display_name, created_at FROM users WHERE id = ?').get(user.id) as any;
  if (!u) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  logger.auth.tokenVerify(u.username, ip);
  res.json({ user: { id: u.id, username: u.username, displayName: u.display_name, createdAt: u.created_at } });
});

export default router;
