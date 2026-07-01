/**
 * SkillLibrary — SQLite-backed skill storage with FTS5 search
 *
 * Skills are reusable action patterns that can be retrieved
 * by similarity to the current task.
 */

import Database from 'better-sqlite3';

export class SkillLibrary {
  constructor(dbPath = './data/skills.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  async init() {
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        code TEXT,
        params TEXT,
        success_criteria TEXT,
        token_cost INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts5(
        name, description, params,
        content=skills,
        content_rowid=id
      );
    `);

    // Load default skills
    this.loadDefaults();
  }

  loadDefaults() {
    const defaults = [
      {
        name: 'mine_block',
        description: 'Mine a specific block type near current position',
        code: 'mine <block> [count]',
        params: JSON.stringify({ block: 'string', count: 'number?' }),
      },
      {
        name: 'go_to',
        description: 'Move to coordinates or player',
        code: 'go <x> <y> <z> | goto <player>',
        params: JSON.stringify({ target: 'string' }),
      },
      {
        name: 'craft_item',
        description: 'Craft an item using nearby crafting table',
        code: 'craft <item> [count]',
        params: JSON.stringify({ item: 'string', count: 'number?' }),
      },
      {
        name: 'build_structure',
        description: 'Build a structure from natural language description',
        code: 'build <description>',
        params: JSON.stringify({ description: 'string' }),
      },
      {
        name: 'attack_mob',
        description: 'Attack hostile mobs nearby',
        code: 'attack [type]',
        params: JSON.stringify({ type: 'string?' }),
      },
    ];

    for (const skill of defaults) {
      this.save(skill);
    }
  }

  save(skill) {
    const now = Date.now();
    const existing = this.db.prepare('SELECT id FROM skills WHERE name = ?').get(skill.name);

    if (existing) {
      this.db.prepare(
        'UPDATE skills SET description = ?, code = ?, params = ?, updated_at = ? WHERE name = ?'
      ).run(skill.description, skill.code, skill.params || null, now, skill.name);
    } else {
      this.db.prepare(
        'INSERT INTO skills (name, description, code, params, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(skill.name, skill.description, skill.code, skill.params || null, now, now);

      // Update FTS index
      this.db.prepare(
        'INSERT INTO skills_fts (rowid, name, description, params) VALUES (?, ?, ?, ?)'
      ).run(this.lastId(), skill.name, skill.description, skill.params || '');
    }
  }

  lastId() {
    return this.db.prepare('SELECT last_insert_rowid() as id').get().id;
  }

  /**
   * Search skills by text similarity (FTS5)
   */
  searchSync(query, limit = 5) {
    try {
      return this.db.prepare(
        `SELECT s.*, rank FROM skills_fts fts
         JOIN skills s ON s.id = fts.rowid
         WHERE skills_fts MATCH ?
         ORDER BY rank
         LIMIT ?`
      ).all(query, limit);
    } catch {
      // FTS5 match syntax can be picky, fall back to LIKE
      return this.db.prepare(
        'SELECT * FROM skills WHERE description LIKE ? OR name LIKE ? LIMIT ?'
      ).all(`%${query}%`, `%${query}%`, limit);
    }
  }

  get(name) {
    return this.db.prepare('SELECT * FROM skills WHERE name = ?').get(name);
  }

  list() {
    return this.db.prepare('SELECT * FROM skills ORDER BY name').all();
  }

  recordSuccess(name) {
    this.db.prepare('UPDATE skills SET success_count = success_count + 1 WHERE name = ?').run(name);
  }

  recordFailure(name) {
    this.db.prepare('UPDATE skills SET fail_count = fail_count + 1 WHERE name = ?').run(name);
  }

  async close() {
    if (this.db) this.db.close();
  }
}
