const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dbPath = path.resolve(__dirname, "..", "data", "db.sqlite");

// Ensure directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Open database (synchronous)
const db = new Database(dbPath);
console.log("✅ better-sqlite3 connected at", dbPath);

// ✅ FIXED: Moved all table creation into init() function
function init() {
  // Create Users Table
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT,
      profile TEXT,
      isActive INTEGER DEFAULT 1,
      isEmailVerified INTEGER DEFAULT 0,
      lastLogin TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT
    )
  `;
  db.prepare(createUsersTable).run();
  console.log("✅ SQLite: users table is ready");

  // Create Refresh Tokens Table
  const createRefreshTable = `
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE,
      user_id INTEGER,
      expiresAt TEXT,
      createdAt TEXT
    )
  `;
  db.prepare(createRefreshTable).run();
  console.log("✅ SQLite: refresh_tokens table is ready");

  // Create Notifications Table
  const createNotificationsTable = `
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient INTEGER,
      type TEXT,
      title TEXT,
      message TEXT,
      relatedPost INTEGER,
      relatedComment INTEGER,
      actionBy INTEGER,
      isRead INTEGER DEFAULT 0,
      readAt TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `;
  db.prepare(createNotificationsTable).run();
  console.log("✅ SQLite: notifications table is ready");
}

// Helper functions for database operations
function run(query, params = []) {
  const stmt = db.prepare(query);
  const info = stmt.run(...params);
  return info; // { changes, lastInsertRowid }
}

function get(query, params = []) {
  const stmt = db.prepare(query);
  return stmt.get(...params);
}

function all(query, params = []) {
  const stmt = db.prepare(query);
  return stmt.all(...params);
}

module.exports = {
  db,
  init,
  run,
  get,
  all,
};