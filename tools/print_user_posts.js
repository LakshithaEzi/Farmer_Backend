const path = require("path");
const { db, init } = require("../Config/sqlite");

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.error("Usage: node tools/print_user_posts.js <userId>");
    process.exit(1);
  }
  const userId = args[0];

  // Ensure DB initialized (noop if already)
  if (typeof init === "function") init();

  try {
    const rows = db
      .prepare(
        "SELECT id, title, status, author, createdAt FROM posts WHERE author = ? ORDER BY createdAt DESC"
      )
      .all(userId);
    if (!rows || rows.length === 0) {
      console.log(`No posts found for userId=${userId}`);
      return;
    }

    console.log(`Posts for userId=${userId}:`);
    for (const r of rows) {
      console.log(
        `- id=${r.id} status=${r.status} title=${r.title} createdAt=${r.createdAt}`
      );
    }
  } catch (err) {
    console.error("Error querying posts:", err.message);
    process.exit(2);
  }
}

main();
