/**
 * Memory — Short-term and long-term memory for the agent
 *
 * Short-term: recent conversation turns (in-memory)
 * Long-term: SQLite-backed episodic + semantic memory
 */

import Database from 'better-sqlite3';

export class Memory {
  constructor(dbPath = './data/memory.db') {
    this.dbPath = dbPath;
    this.db = null;
    this.shortTerm = [];
    this.summary = '';
  }

  async init() {
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        session_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        importance REAL DEFAULT 0.5
      );
      CREATE TABLE IF NOT EXISTS facts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_episodes_timestamp ON episodes(timestamp);
      CREATE INDEX IF NOT EXISTS idx_facts_key ON facts(key);
    `);
  }

  addTurn(role, speaker, content) {
    const turn = { role, speaker, content, timestamp: Date.now() };
    this.shortTerm.push(turn);

    // Also persist to SQLite
    this.db.prepare(
      'INSERT INTO episodes (timestamp, role, content) VALUES (?, ?, ?)'
    ).run(turn.timestamp, role, `${speaker}: ${content}`);
  }

  getRecent(count = 10) {
    return this.shortTerm.slice(-count);
  }

  getSummary() {
    return this.summary;
  }

  /**
   * Summarize old turns when history gets too long.
   * Keeps the summary compact.
   */
  trim(maxTurns = 20) {
    if (this.shortTerm.length <= maxTurns) return;

    const excess = this.shortTerm.splice(0, this.shortTerm.length - maxTurns);
    const summaryParts = excess.map(t => `${t.speaker}: ${t.content.slice(0, 50)}`);
    this.summary = summaryParts.slice(-5).join('; ');
    if (this.summary.length > 200) {
      this.summary = this.summary.slice(0, 200) + '...';
    }
  }

  /**
   * Store a persistent fact (key-value)
   */
  setFact(key, value) {
    this.db.prepare(
      'INSERT OR REPLACE INTO facts (key, value, updated_at) VALUES (?, ?, ?)'
    ).run(key, value, Date.now());
  }

  getFact(key) {
    const row = this.db.prepare('SELECT value FROM facts WHERE key = ?').get(key);
    return row?.value || null;
  }

  /**
   * Search episodes by content
   */
  search(query, limit = 5) {
    return this.db.prepare(
      'SELECT * FROM episodes WHERE content LIKE ? ORDER BY timestamp DESC LIMIT ?'
    ).all(`%${query}%`, limit);
  }

  async close() {
    if (this.db) this.db.close();
  }
}
