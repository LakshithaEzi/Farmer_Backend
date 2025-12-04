require("dotenv").config();

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.error("Usage: node tools/print_user_posts.js <userId>");
    process.exit(1);
  }
  const userId = args[0];

  // Initialize MySQL connection
  const db = require("../Config/mysql");

  try {
    await db.createPool();
    console.log("✅ MySQL initialized");

    const rows = await db.all(
      "SELECT id, title, status, author, createdAt FROM posts WHERE author = ? ORDER BY createdAt DESC",
      [userId]
    );

    if (!rows || rows.length === 0) {
      console.log(`No posts found for userId=${userId}`);
      await db.close();
      return;
    }

    console.log(`Posts for userId=${userId}:`);
    for (const r of rows) {
      console.log(
        `- id=${r.id} status=${r.status} title=${r.title} createdAt=${r.createdAt}`
      );
    }

    await db.close();
  } catch (err) {
    console.error("Error querying posts:", err.message);
    await db.close();
    process.exit(2);
  }
}

main();
