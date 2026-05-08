import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'novelflow.log');
const AUTH_LOG = path.join(LOG_DIR, 'auth.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function timestamp(): string {
  return new Date().toISOString();
}

function writeLog(file: string, level: string, message: string, meta?: Record<string, any>): void {
  const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
  const line = `[${timestamp()}] [${level}] ${message}${metaStr}\n`;
  
  // Write to file
  fs.appendFileSync(file, line);
  
  // Also print to console (picked up by journald)
  if (level === 'ERROR') {
    console.error(`[LOG] ${message}${metaStr}`);
  } else {
    console.log(`[LOG] ${message}${metaStr}`);
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    writeLog(LOG_FILE, 'INFO', message, meta);
  },
  warn: (message: string, meta?: Record<string, any>) => {
    writeLog(LOG_FILE, 'WARN', message, meta);
  },
  error: (message: string, meta?: Record<string, any>) => {
    writeLog(LOG_FILE, 'ERROR', message, meta);
  },
  auth: {
    loginSuccess: (username: string, ip: string, userId: string) => {
      writeLog(AUTH_LOG, 'LOGIN_OK', `用户登录成功`, { username, ip, userId });
    },
    loginFail: (username: string, ip: string, reason: string) => {
      writeLog(AUTH_LOG, 'LOGIN_FAIL', `用户登录失败`, { username, ip, reason });
    },
    register: (username: string, ip: string, userId: string) => {
      writeLog(AUTH_LOG, 'REGISTER', `新用户注册`, { username, ip, userId });
    },
    registerDuplicate: (username: string, ip: string) => {
      writeLog(AUTH_LOG, 'REGISTER_DUP', `注册用户名重复`, { username, ip });
    },
    tokenVerify: (username: string, ip: string) => {
      writeLog(AUTH_LOG, 'TOKEN_OK', `Token验证通过`, { username, ip });
    },
    logout: (username: string, ip: string) => {
      writeLog(AUTH_LOG, 'LOGOUT', `用户登出`, { username, ip });
    },
  },
  agent: {
    call: (role: string, model: string, tokens: number) => {
      writeLog(LOG_FILE, 'AGENT', `Agent调用`, { role, model, tokens });
    },
  },
};
