import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'novelflow-secret-change-in-production';

export interface AuthUser {
  id: string;
  username: string;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未授权，请先登录' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    (req as any).user = user;
    next();
  } catch {
    res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}
