const crypto = require("crypto");
const db = require("../Config/mysql");

// Helper: hash password (keeps existing SHA-1 behavior for compatibility)
function hashPassword(password) {
  return crypto.createHash("sha1").update(password).digest("hex");
}

// Helper: format date for MySQL DATETIME
function formatMySQLDateTime(date = new Date()) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
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
    const row = await db.get(sql, params);
    return mapRowToUser(row);
  }

  // Single-field lookup
  const key = Object.keys(filter)[0];
  const value = filter[key];
  const sql = `SELECT * FROM users WHERE ${key} = ? LIMIT 1`;
  const row = await db.get(sql, [value]);
  return mapRowToUser(row);
}

async function create(data) {
  const now = formatMySQLDateTime();
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

  const info = await db.run(stmt, params);
  const id =
    info.lastInsertRowid || info.lastInsertROWID || info.lastInsertId || null;
  const row = await db.get("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return mapRowToUser(row);
}

async function findById(id) {
  const row = await db.get("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return mapRowToUser(row);
}

function buildWhere(filter, params) {
  const where = [];
  if (!filter) return { clause: "", params };

  if (filter.isActive !== undefined) {
    where.push("isActive = ?");
    params.push(filter.isActive ? 1 : 0);
  }
  if (filter.role) {
    where.push("role = ?");
    params.push(filter.role);
  }
  if (filter.isEmailVerified !== undefined) {
    where.push("isEmailVerified = ?");
    params.push(filter.isEmailVerified ? 1 : 0);
  }

  return { clause: where.length ? "WHERE " + where.join(" AND ") : "", params };
}

async function find(filter = {}, options = {}) {
  const page = parseInt(options.page || 1, 10);
  const limit = parseInt(options.limit || 20, 10);
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || "createdAt";
  const order = options.order === "asc" ? "ASC" : "DESC";

  const params = [];
  const whereObj = buildWhere(filter, params);
  const sql = `SELECT * FROM users ${whereObj.clause} ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`;
  params.push(limit, skip);

  const rows = await db.all(sql, params);
  const users = rows.map(row => mapRowToUser(row));
  return users;
}

async function count(filter = {}) {
  const params = [];
  const whereObj = buildWhere(filter, params);
  const sql = `SELECT COUNT(*) as cnt FROM users ${whereObj.clause}`;

  const row = await db.get(sql, params);
  return row ? row.cnt : 0;
}

module.exports = {
  findOne,
  create,
  findById,
  find,
  count,
};
