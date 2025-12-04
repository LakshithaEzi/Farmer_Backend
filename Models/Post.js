const { db } = require("../Config/sqlite");
const User = require("./User");

// Ensure posts table exists
const createPostsTable = `
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    title TEXT,
    content TEXT,
    category TEXT,
    images TEXT,
    author INTEGER,
    status TEXT DEFAULT 'pending',
    moderationNote TEXT,
    moderatedBy INTEGER,
    moderatedAt TEXT,
    likes TEXT,
    commentsCount INTEGER DEFAULT 0,
    viewsCount INTEGER DEFAULT 0,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT
  )
`;

db.prepare(createPostsTable).run();

function now() {
  return new Date().toISOString();
}

function mapRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    images: row.images ? JSON.parse(row.images) : [],
    author: null,
    authorId: row.author,
    status: row.status,
    moderationNote: row.moderationNote,
    moderatedBy: row.moderatedBy,
    moderatedAt: row.moderatedAt,
    likes: row.likes ? JSON.parse(row.likes) : [],
    commentsCount: row.commentsCount,
    viewsCount: row.viewsCount,
    isActive: row.isActive === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function create(data) {
  const stmt = `INSERT INTO posts (title, content, category, images, author, status, likes, commentsCount, viewsCount, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const images = data.images ? JSON.stringify(data.images) : JSON.stringify([]);
  const likes = JSON.stringify([]);
  const createdAt = now();
  const updatedAt = now();
  const params = [
    data.title,
    data.content,
    data.category || "general",
    images,
    data.author,
    data.status || "pending",
    likes,
    data.commentsCount || 0,
    data.viewsCount || 0,
    data.isActive ? 1 : 1,
    createdAt,
    updatedAt,
  ];
  
  // ✅ FIXED: Use prepare().run() for better-sqlite3
  const info = db.prepare(stmt).run(params);
  const id = info.lastInsertRowid;
  
  const row = db.prepare("SELECT * FROM posts WHERE id = ? LIMIT 1").get(id);
  const post = mapRow(row);
  post.author = await User.findById(post.authorId);
  return post;
}

function buildWhere(filter, params) {
  const where = [];
  if (!filter) return { clause: "", params };
  if (filter.status) {
    where.push("status = ?");
    params.push(filter.status);
  }
  if (filter.isActive !== undefined) {
    where.push("isActive = ?");
    params.push(filter.isActive ? 1 : 0);
  }
  if (filter.category) {
    where.push("category = ?");
    params.push(filter.category);
  }
  if (filter.author) {
    where.push("author = ?");
    params.push(filter.author);
  }
  if (where.length === 0) return { clause: "", params };
  return { clause: "WHERE " + where.join(" AND "), params };
}

async function find(filter = {}, options = {}) {
  const page = parseInt(options.page || 1, 10);
  const limit = parseInt(options.limit || 10, 10);
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || "createdAt";
  const order = options.order === "asc" ? "ASC" : "DESC";

  const params = [];
  const whereObj = buildWhere(filter, params);
  const sql = `SELECT * FROM posts ${whereObj.clause} ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`;
  params.push(limit, skip);
  
  // ✅ FIXED: Use prepare().all()

  const rows = db.prepare(sql).all(params);
  const posts = [];
  for (const row of rows) {
    const post = mapRow(row);
    post.author = await User.findById(post.authorId);
    posts.push(post);
  }
  return posts;
}

function count(filter = {}) {
  const params = [];
  const whereObj = buildWhere(filter, params);
  const sql = `SELECT COUNT(*) as cnt FROM posts ${whereObj.clause}`;
  
  // ✅ FIXED: Use prepare().get()
  const row = db.prepare(sql).get(params);
  return row ? row.cnt : 0;
}

async function findById(id) {
  // ✅ FIXED: Use prepare().get()
  const row = db.prepare("SELECT * FROM posts WHERE id = ? LIMIT 1").get(id);
  const post = mapRow(row);
  if (!post) return null;
  post.author = await User.findById(post.authorId);
  if (post.moderatedBy)
    post.moderatedBy = await User.findById(post.moderatedBy);
  return post;
}

function update(id, data) {
  const fields = [];
  const params = [];
  if (data.title !== undefined) {
    fields.push("title = ?");
    params.push(data.title);
  }
  if (data.content !== undefined) {
    fields.push("content = ?");
    params.push(data.content);
  }
  if (data.category !== undefined) {
    fields.push("category = ?");
    params.push(data.category);
  }
  if (data.images !== undefined) {
    fields.push("images = ?");
    params.push(JSON.stringify(data.images));
  }
  if (data.status !== undefined) {
    fields.push("status = ?");
    params.push(data.status);
  }
  if (data.moderationNote !== undefined) {
    fields.push("moderationNote = ?");
    params.push(data.moderationNote);
  }
  if (data.moderatedBy !== undefined) {
    fields.push("moderatedBy = ?");
    params.push(data.moderatedBy);
  }
  if (data.moderatedAt !== undefined) {
    fields.push("moderatedAt = ?");
    params.push(data.moderatedAt);
  }
  if (data.isActive !== undefined) {
    fields.push("isActive = ?");
    params.push(data.isActive ? 1 : 0);
  }
  if (data.commentsCount !== undefined) {
    fields.push("commentsCount = ?");
    params.push(data.commentsCount);
  }
  if (data.viewsCount !== undefined) {
    fields.push("viewsCount = ?");
    params.push(data.viewsCount);
  }
  if (fields.length === 0) return null;
  fields.push("updatedAt = ?");
  params.push(now());
  params.push(id);
  const sql = `UPDATE posts SET ${fields.join(", ")} WHERE id = ?`;
  
  // ✅ FIXED: Use prepare().run()
  db.prepare(sql).run(params);
  return findById(id);
}

function incrementViews(id) {
  // ✅ FIXED: Use prepare().run()
  db.prepare("UPDATE posts SET viewsCount = viewsCount + 1 WHERE id = ?").run(id);
  return findById(id);
}

function toggleLike(id, userId) {
  // ✅ FIXED: Use prepare().get()
  const row = db.prepare("SELECT likes FROM posts WHERE id = ? LIMIT 1").get(id);
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
  
  // ✅ FIXED: Use prepare().run()
  db.prepare("UPDATE posts SET likes = ? WHERE id = ?").run(
    JSON.stringify(likes),
    id
  );
  return { action, likesCount: likes.length };
}

module.exports = {
  create,
  find,
  count,
  findById,
  update,
  incrementViews,
  toggleLike,
};