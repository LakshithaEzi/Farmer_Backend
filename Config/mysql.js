const mysql = require("mysql2/promise");

// Create connection pool
let pool;

async function createPool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "farm_app",
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  console.log("✅ MySQL connection pool created");
  return pool;
}

// Initialize database tables
async function init() {
  const connection = await pool.getConnection();

  try {
    // Create Users Table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        role VARCHAR(50),
        profile TEXT,
        isActive TINYINT(1) DEFAULT 1,
        isEmailVerified TINYINT(1) DEFAULT 0,
        lastLogin DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await connection.query(createUsersTable);
    console.log("✅ MySQL: users table is ready");

    // Create Refresh Tokens Table
    const createRefreshTable = `
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT PRIMARY KEY AUTO_INCREMENT,
        token VARCHAR(255) UNIQUE,
        user_id INT,
        expiresAt DATETIME,
        createdAt DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    await connection.query(createRefreshTable);
    console.log("✅ MySQL: refresh_tokens table is ready");

    // Create Posts Table
    const createPostsTable = `
      CREATE TABLE IF NOT EXISTS posts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title TEXT,
        content TEXT,
        category VARCHAR(100),
        images TEXT,
        author INT,
        status VARCHAR(50) DEFAULT 'pending',
        moderationNote TEXT,
        moderatedBy INT,
        moderatedAt DATETIME,
        likes TEXT,
        commentsCount INT DEFAULT 0,
        viewsCount INT DEFAULT 0,
        isActive TINYINT(1) DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (author) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    await connection.query(createPostsTable);
    console.log("✅ MySQL: posts table is ready");

    // Create Comments Table
    const createCommentsTable = `
      CREATE TABLE IF NOT EXISTS comments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        post INT,
        author INT,
        content TEXT,
        parentComment INT,
        likes TEXT,
        isActive TINYINT(1) DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (post) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (author) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    await connection.query(createCommentsTable);
    console.log("✅ MySQL: comments table is ready");

    // Create Notifications Table
    const createNotificationsTable = `
      CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        recipient INT,
        type VARCHAR(50),
        title VARCHAR(255),
        message TEXT,
        relatedPost INT,
        relatedComment INT,
        actionBy INT,
        isRead TINYINT(1) DEFAULT 0,
        readAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipient) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (actionBy) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    await connection.query(createNotificationsTable);
    console.log("✅ MySQL: notifications table is ready");
  } finally {
    connection.release();
  }
}

// Helper functions for database operations (async versions)
async function run(query, params = []) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(query, params);
    return {
      changes: result.affectedRows || 0,
      lastInsertRowid: result.insertId || 0,
    };
  } finally {
    connection.release();
  }
}

async function get(query, params = []) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(query, params);
    return rows[0] || null;
  } finally {
    connection.release();
  }
}

async function all(query, params = []) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(query, params);
    return rows;
  } finally {
    connection.release();
  }
}

// Close pool (for graceful shutdown)
async function close() {
  if (pool) {
    await pool.end();
    console.log("✅ MySQL connection pool closed");
  }
}

module.exports = {
  createPool,
  init,
  run,
  get,
  all,
  close,
};
