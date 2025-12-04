const path = require("path");
const { db, init, run } = require("../Config/sqlite");
const crypto = require("crypto");

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

  // Ensure tables exist
  if (typeof init === "function") init();

  const hashed = hashPassword(password);
  const now = new Date().toISOString();

  try {
    const stmt = `INSERT INTO users (username, email, password, role, isActive, isEmailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const info = db
      .prepare(stmt)
      .run(username, email, hashed, "admin", 1, 1, now, now);
    const id =
      info.lastInsertRowid ||
      info.lastInsertROWID ||
      info.lastInsertId ||
      info.lastInsert;
    console.log(
      `Admin user created with id=${id} (username=${username}, email=${email})`
    );
  } catch (err) {
    console.error("Failed to create admin:", err.message);
    process.exit(2);
  }
}

main();
