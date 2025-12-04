const crypto = require("crypto");
const db = require("../Config/sqlite");

// Helper: hash password (keeps existing SHA-1 behavior for compatibility)
function hashPassword(password) {
  return crypto.createHash("sha1").update(password).digest("hex");
}

// Map DB row to user-like object used by controllers
function mapRowToUser(row) {
  if (!row) return null;
  const user = {
    _id: row.id,
    id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    role: row.role,
    profile: row.profile ? JSON.parse(row.profile) : null,
    isActive: row.isActive === 1,
    isEmailVerified: row.isEmailVerified === 1,
    lastLogin: row.lastLogin,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    comparePassword(candidate) {
      const hashed = hashPassword(candidate);
      return hashed === this.password;
    },
  };
  return user;
}

async function findOne(filter) {
  // Support simple lookups and $or from existing controllers
  if (!filter) return null;

  if (filter.$or && Array.isArray(filter.$or)) {
    const clauses = filter.$or.map((f) => {
      const key = Object.keys(f)[0];
      return `${key} = ?`;
    });
    const params = filter.$or.map((f) => Object.values(f)[0]);
    const sql = `SELECT * FROM users WHERE ${clauses.join(" OR ")} LIMIT 1`;
    const row = db.get(sql, params);
    return mapRowToUser(row);
  }

  // Single-field lookup
  const key = Object.keys(filter)[0];
  const value = filter[key];
  const sql = `SELECT * FROM users WHERE ${key} = ? LIMIT 1`;
  const row = db.get(sql, [value]);
  return mapRowToUser(row);
}

async function create(data) {
  const now = new Date().toISOString();
  const hashed = hashPassword(data.password);
  const profileStr = data.profile ? JSON.stringify(data.profile) : null;
  const stmt = `INSERT INTO users (username, email, password, role, profile, isActive, isEmailVerified, lastLogin, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    data.username || null,
    data.email || null,
    hashed,
    data.role || "registered",
    profileStr,
    data.isActive ? 1 : 1,
    data.isEmailVerified ? 1 : 0,
    data.lastLogin || null,
    now,
    now,
  ];

  const info = db.run(stmt, params);
  const id =
    info.lastInsertRowid || info.lastInsertROWID || info.lastInsertId || null;
  const row = db.get("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return mapRowToUser(row);
}

async function findById(id) {
  const row = db.get("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return mapRowToUser(row);
}

module.exports = {
  findOne,
  create,
  findById,
};
