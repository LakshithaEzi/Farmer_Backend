const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

function hashPassword(password) {
  return crypto.createHash("sha1").update(password).digest("hex");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error(
      "Usage: node scripts/create_admin.js <username> <email> <password>"
    );
    process.exit(1);
  }

  const [username, email, password] = args;

  // Initialize MySQL connection
  const db = require("../Config/mysql");

  try {
    await db.createPool();
    await db.init();
    console.log("✅ MySQL initialized");

    const hashed = hashPassword(password);
    const now = new Date().toISOString();

    const stmt = `INSERT INTO users (username, email, password, role, isActive, isEmailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const info = await db.run(stmt, [username, email, hashed, "admin", 1, 1, now, now]);

    const id = info.lastInsertRowid || info.lastInsertId;
    console.log(
      `✅ Admin user created with id=${id} (username=${username}, email=${email})`
    );

    await db.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to create admin:", err.message);
    process.exit(2);
  }
}

main();
