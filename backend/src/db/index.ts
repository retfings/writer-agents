import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/novelflow.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      genre TEXT NOT NULL DEFAULT 'urban',
      synopsis TEXT DEFAULT '',
      target_words INTEGER DEFAULT 1000000,
      status TEXT DEFAULT 'draft',
      agent_config TEXT DEFAULT '[]',
      model_provider TEXT DEFAULT 'deepseek',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT '',
      description TEXT DEFAULT '',
      traits TEXT DEFAULT '[]',
      relationships TEXT DEFAULT '[]',
      arc TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      title TEXT DEFAULT '',
      outline TEXT DEFAULT '',
      content TEXT DEFAULT '',
      word_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'outline',
      characters TEXT DEFAULT '[]',
      key_events TEXT DEFAULT '[]',
      agent_notes TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS foreshadowing (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      planted_chapter_id TEXT,
      revealed_chapter_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS world_notes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      category TEXT DEFAULT 'general',
      chapter_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
      content TEXT NOT NULL,
      context TEXT DEFAULT '{}',
      token_usage TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id, number);
    CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
    CREATE INDEX IF NOT EXISTS idx_foreshadowing_project ON foreshadowing(project_id);
    CREATE INDEX IF NOT EXISTS idx_world_notes_project ON world_notes(project_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_project ON chat_messages(project_id, created_at);
  `);
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
