# SQLite to MySQL Migration Guide

## What Changed

Your Node.js project has been successfully migrated from SQLite (better-sqlite3) to MySQL (mysql2). All database operations now use MySQL connection pooling with async/await.

## Files Modified

### Configuration
- **NEW**: [Config/mysql.js](Config/mysql.js) - MySQL connection pool and initialization
- **OLD**: Config/sqlite.js (no longer used, can be deleted)

### Models
- [Models/User.js](Models/User.js) - Updated to use MySQL async operations
- [Models/Post.js](Models/Post.js) - Updated to use MySQL async operations
- [Models/Comment.js](Models/Comment.js) - Updated to use MySQL async operations
- [Models/Notification.js](Models/Notification.js) - Updated to use MySQL async operations

### Controllers
- [Controllers/authController.js](Controllers/authController.js) - Updated refresh, login, logout to async

### Server
- [server.js](server.js) - Updated to initialize MySQL and handle graceful shutdown

## Setup Instructions

### 1. Install MySQL Server

**Windows:**
- Download from: https://dev.mysql.com/downloads/mysql/
- Or use XAMPP/WAMP which includes MySQL

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install mysql-server
sudo systemctl start mysql
```

### 2. Create Database

Log into MySQL:
```bash
mysql -u root -p
```

Create the database:
```sql
CREATE DATABASE farm_app;
```

Create a user (optional but recommended):
```sql
CREATE USER 'farmapp_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON farm_app.* TO 'farmapp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Configure Environment Variables

Copy the example file:
```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=farm_app
DB_PORT=3306

JWT_SECRET=your_jwt_secret_key_here
```

### 4. Start the Server

The tables will be created automatically on first run:
```bash
npm start
# or for development
npm run dev
```

You should see:
```
✅ MySQL connection pool created
✅ MySQL: users table is ready
✅ MySQL: refresh_tokens table is ready
✅ MySQL: posts table is ready
✅ MySQL: comments table is ready
✅ MySQL: notifications table is ready
✅ MySQL initialized successfully
🚀 Server running on port 5000
```

## Key Differences

### 1. All Database Operations Are Now Async

**Before (SQLite):**
```javascript
const row = db.get("SELECT * FROM users WHERE id = ?", [id]);
```

**After (MySQL):**
```javascript
const row = await db.get("SELECT * FROM users WHERE id = ?", [id]);
```

### 2. Connection Pooling

MySQL uses connection pooling, which automatically manages connections for better performance under load.

### 3. Data Types

- SQLite `INTEGER` → MySQL `INT`
- SQLite `TEXT` → MySQL `TEXT` or `VARCHAR(255)`
- SQLite `INTEGER(1)` → MySQL `TINYINT(1)` for booleans

### 4. Auto Increment

- SQLite: `INTEGER PRIMARY KEY AUTOINCREMENT`
- MySQL: `INT PRIMARY KEY AUTO_INCREMENT`

## Migrating Existing Data (Optional)

If you have existing SQLite data to migrate:

### Option 1: Manual Export/Import
1. Export from SQLite to CSV
2. Import CSV into MySQL

### Option 2: Use Migration Script
Create a script to read from SQLite and write to MySQL (contact for assistance).

## Troubleshooting

### Error: "Can't connect to MySQL server"
- Ensure MySQL server is running: `sudo systemctl status mysql` (Linux) or check Services (Windows)
- Check DB_HOST, DB_PORT in .env
- Verify firewall isn't blocking port 3306

### Error: "Access denied for user"
- Check DB_USER and DB_PASSWORD in .env
- Ensure user has correct permissions

### Error: "Unknown database"
- Create the database: `CREATE DATABASE farm_app;`

### Tables not created
- Check MySQL initialization logs in console
- Verify user has CREATE TABLE permissions

## Benefits of MySQL

1. **Better Performance at Scale**: Handles concurrent connections better
2. **Production Ready**: More suitable for production deployments
3. **Better Tooling**: Many GUI tools (MySQL Workbench, phpMyAdmin)
4. **Remote Access**: Can connect from different servers
5. **ACID Compliance**: Better transaction support
6. **Replication**: Supports master-slave replication for redundancy

## Cleanup (Optional)

After confirming everything works, you can remove:
- `Config/sqlite.js`
- `data/db.sqlite` (backup first!)
- SQLite dependencies from package.json:
  ```bash
  npm uninstall better-sqlite3 sqlite3
  ```

## Need Help?

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify MySQL is running and credentials are correct
3. Ensure the database exists and user has proper permissions
