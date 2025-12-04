const db = require("../Config/mysql");
const User = require("./User");
const Post = require("./Post");

function now() {
  return new Date().toISOString();
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    content: row.content,
    postId: row.post,
    post: null,
    authorId: row.author,
    author: null,
    parentCommentId: row.parentComment,
    likes: row.likes ? JSON.parse(row.likes) : [],
    isActive: row.isActive === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function create(data) {
  const stmt = `INSERT INTO comments (content, post, author, parentComment, likes, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const createdAt = now();
  const params = [
    data.content,
    data.post,
    data.author,
    data.parentComment || null,
    JSON.stringify([]),
    data.isActive ? 1 : 1,
    createdAt,
    createdAt,
  ];
  const info = await db.run(stmt, params);
  const id =
    info.lastInsertROWID ||
    info.lastInsertRowid ||
    info.lastInsertId ||
    info.lastInsert;
  const row = await db.get("SELECT * FROM comments WHERE id = ? LIMIT 1", [id]);
  const c = mapRow(row);
  if (c) {
    c.author = await User.findById(c.authorId);
    c.post = await Post.findById(c.postId);
  }
  return c;
}

async function findTopLevelByPost(postId, options = {}) {
  const page = parseInt(options.page || 1, 10);
  const limit = parseInt(options.limit || 20, 10);
  const skip = (page - 1) * limit;
  const rows = await db.all(
    "SELECT * FROM comments WHERE post = ? AND isActive = 1 AND parentComment IS NULL ORDER BY createdAt DESC LIMIT ? OFFSET ?",
    [postId, limit, skip]
  );
  const results = [];
  for (const row of rows) {
    const c = mapRow(row);
    c.author = await User.findById(c.authorId);
    results.push(c);
  }
  return results;
}

async function findReplies(parentId) {
  const rows = await db.all(
    "SELECT * FROM comments WHERE parentComment = ? AND isActive = 1 ORDER BY createdAt ASC",
    [parentId]
  );
  const results = [];
  for (const row of rows) {
    const c = mapRow(row);
    c.author = await User.findById(c.authorId);
    results.push(c);
  }
  return results;
}

async function findById(id) {
  const row = await db.get("SELECT * FROM comments WHERE id = ? LIMIT 1", [id]);
  const c = mapRow(row);
  if (!c) return null;
  c.author = await User.findById(c.authorId);
  c.post = await Post.findById(c.postId);
  return c;
}

async function update(id, data) {
  const fields = [];
  const params = [];
  if (data.content !== undefined) {
    fields.push("content = ?");
    params.push(data.content);
  }
  if (data.isActive !== undefined) {
    fields.push("isActive = ?");
    params.push(data.isActive ? 1 : 0);
  }
  if (data.likes !== undefined) {
    fields.push("likes = ?");
    params.push(JSON.stringify(data.likes));
  }
  if (fields.length === 0) return null;
  fields.push("updatedAt = ?");
  params.push(now());
  params.push(id);
  const sql = `UPDATE comments SET ${fields.join(", ")} WHERE id = ?`;
  await db.run(sql, params);
  return findById(id);
}

async function remove(id) {
  await db.run("DELETE FROM comments WHERE id = ?", [id]);
  return true;
}

async function softDelete(id) {
  await db.run("UPDATE comments SET isActive = 0, updatedAt = ? WHERE id = ?", [
    now(),
    id,
  ]);
  return findById(id);
}

async function toggleLike(id, userId) {
  const row = await db.get("SELECT likes FROM comments WHERE id = ? LIMIT 1", [id]);
  if (!row) return null;
  const likes = row.likes ? JSON.parse(row.likes) : [];
  const idx = likes.indexOf(userId.toString());
  let action = "liked";
  if (idx > -1) {
    likes.splice(idx, 1);
    action = "unliked";
  } else {
    likes.push(userId.toString());
  }
  await db.run("UPDATE comments SET likes = ? WHERE id = ?", [
    JSON.stringify(likes),
    id,
  ]);
  return { action, likesCount: likes.length };
}

module.exports = {
  create,
  findTopLevelByPost,
  findReplies,
  findById,
  update,
  remove,
  softDelete,
  toggleLike,
};
