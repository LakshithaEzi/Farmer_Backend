const db = require("../Config/mysql");
const User = require("./User");
const Post = require("./Post");

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    recipientId: row.recipient,
    recipient: null,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedPostId: row.relatedPost,
    relatedPost: null,
    relatedCommentId: row.relatedComment,
    actionById: row.actionBy,
    actionBy: null,
    isRead: row.isRead === 1,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

async function create(data) {
  const stmt = `INSERT INTO notifications (recipient, type, title, message, relatedPost, relatedComment, actionBy, isRead, readAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const createdAt = new Date().toISOString();
  const params = [
    data.recipient,
    data.type,
    data.title,
    data.message,
    data.relatedPost || null,
    data.relatedComment || null,
    data.actionBy || null,
    data.isRead ? 1 : 0,
    data.readAt || null,
    createdAt,
  ];
  const info = await db.run(stmt, params);
  const id =
    info.lastInsertROWID ||
    info.lastInsertRowid ||
    info.lastInsertId ||
    info.lastInsert;
  const row = await db.get("SELECT * FROM notifications WHERE id = ? LIMIT 1", [id]);
  const n = mapRow(row);
  // populate small relations
  if (n) {
    n.recipient = await User.findById(n.recipientId);
    if (n.actionById) n.actionBy = await User.findById(n.actionById);
    if (n.relatedPostId) n.relatedPost = await Post.findById(n.relatedPostId);
  }
  return n;
}

function buildWhere(filter, params) {
  const where = [];
  if (!filter) return { clause: "", params };
  if (filter.recipient) {
    where.push("recipient = ?");
    params.push(filter.recipient);
  }
  if (filter.isRead !== undefined) {
    where.push("isRead = ?");
    params.push(filter.isRead ? 1 : 0);
  }
  return { clause: where.length ? "WHERE " + where.join(" AND ") : "", params };
}

async function find(filter = {}, options = {}) {
  const page = parseInt(options.page || 1, 10);
  const limit = parseInt(options.limit || 20, 10);
  const skip = (page - 1) * limit;
  const params = [];
  const whereObj = buildWhere(filter, params);
  const sql = `SELECT * FROM notifications ${whereObj.clause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
  params.push(limit, skip);
  const rows = await db.all(sql, params);
  const results = [];
  for (const row of rows) {
    const n = mapRow(row);
    n.recipient = await User.findById(n.recipientId);
    if (n.actionById) n.actionBy = await User.findById(n.actionById);
    if (n.relatedPostId) n.relatedPost = await Post.findById(n.relatedPostId);
    results.push(n);
  }
  return results;
}

async function count(filter = {}) {
  const params = [];
  const whereObj = buildWhere(filter, params);
  const sql = `SELECT COUNT(*) as cnt FROM notifications ${whereObj.clause}`;
  const row = await db.get(sql, params);
  return row ? row.cnt : 0;
}

async function findById(id) {
  const row = await db.get("SELECT * FROM notifications WHERE id = ? LIMIT 1", [id]);
  const n = mapRow(row);
  if (!n) return null;
  n.recipient = await User.findById(n.recipientId);
  if (n.actionById) n.actionBy = await User.findById(n.actionById);
  if (n.relatedPostId) n.relatedPost = await Post.findById(n.relatedPostId);
  return n;
}

async function update(id, data) {
  const fields = [];
  const params = [];
  if (data.isRead !== undefined) {
    fields.push("isRead = ?");
    params.push(data.isRead ? 1 : 0);
  }
  if (data.readAt !== undefined) {
    fields.push("readAt = ?");
    params.push(data.readAt);
  }
  if (fields.length === 0) return null;
  params.push(id);
  const sql = `UPDATE notifications SET ${fields.join(", ")} WHERE id = ?`;
  await db.run(sql, params);
  return await findById(id);
}

async function remove(id) {
  await db.run("DELETE FROM notifications WHERE id = ?", [id]);
  return true;
}

async function updateMany(filter, data) {
  const params = [];
  const whereObj = buildWhere(filter, params);
  const fields = [];
  const setParams = [];
  if (data.isRead !== undefined) {
    fields.push("isRead = ?");
    setParams.push(data.isRead ? 1 : 0);
  }
  if (data.readAt !== undefined) {
    fields.push("readAt = ?");
    setParams.push(data.readAt);
  }
  if (fields.length === 0) return null;
  const sql = `UPDATE notifications SET ${fields.join(", ")} ${
    whereObj.clause
  }`;
  await db.run(sql, [...setParams, ...params]);
  return true;
}

module.exports = {
  create,
  find,
  count,
  findById,
  update,
  remove,
  updateMany,
};
