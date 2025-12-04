# ✅ Migration Complete: SQLite → MySQL

## Summary

Your Node.js backend has been **successfully migrated** from SQLite to MySQL!

## What Was Done

### 1. **Removed SQLite Dependencies** ✅
- Uninstalled: `better-sqlite3`, `sqlite3`
- Deleted: `Config/sqlite.js`

### 2. **Installed MySQL** ✅
- Added: `mysql2` package with connection pooling

### 3. **Updated All Files** ✅

#### Configuration
- ✅ [Config/mysql.js](Config/mysql.js) - MySQL connection pool

#### Models (All async now)
- ✅ [Models/User.js](Models/User.js)
- ✅ [Models/Post.js](Models/Post.js)
- ✅ [Models/Comment.js](Models/Comment.js)
- ✅ [Models/Notification.js](Models/Notification.js)

#### Controllers
- ✅ [Controllers/authController.js](Controllers/authController.js)
- ✅ [Controllers/postController.js](Controllers/postController.js)
- ✅ [Controllers/commentController.js](Controllers/commentController.js)

#### Routes
- ✅ [Routes/adminRoutes.js](Routes/adminRoutes.js)

#### Scripts & Tools
- ✅ [scripts/create_admin.js](scripts/create_admin.js)
- ✅ [tools/print_user_posts.js](tools/print_user_posts.js)

#### Server
- ✅ [server.js](server.js) - MySQL initialization + graceful shutdown

### 4. **Bonus Fix** ✅
- Implemented **sliding token expiration** - Active users won't get logged out after 7 days!

## Next Steps to Get Running

### Step 1: Install MySQL Server

**Already have MySQL?** Skip to Step 2.

**Windows (Choose one):**
- XAMPP: https://www.apachefriends.org/
- Official MySQL: https://dev.mysql.com/downloads/mysql/

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

### Step 2: Create Database

Open MySQL:
```bash
mysql -u root -p
```

Run these commands:
```sql
CREATE DATABASE farm_app;
EXIT;
```

### Step 3: Configure Environment

Create `.env` file in the project root:
```env
PORT=5000
NODE_ENV=development

# MySQL Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=farm_app
DB_PORT=3306

# JWT Secret
JWT_SECRET=your_secure_random_secret_key_here
```

**IMPORTANT:** Replace `your_mysql_password` with your actual MySQL root password!

### Step 4: Start the Server

```bash
npm start
```

**You should see:**
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

## Database Schema

Your MySQL database will automatically create these tables:

### **users**
- id, username, email, password, role, profile
- isActive, isEmailVerified, lastLogin
- createdAt, updatedAt

### **refresh_tokens**
- id, token, user_id, expiresAt, createdAt

### **posts**
- id, title, content, category, images, author
- status, moderationNote, moderatedBy, moderatedAt
- likes, commentsCount, viewsCount, isActive
- createdAt, updatedAt

### **comments**
- id, post, author, content, parentComment
- likes, isActive, createdAt, updatedAt

### **notifications**
- id, recipient, type, title, message
- relatedPost, relatedComment, actionBy
- isRead, readAt, createdAt

## Testing the Migration

### 1. **Create Admin User**
```bash
node scripts/create_admin.js admin admin@example.com password123
```

### 2. **Test Authentication**
Use Postman/Thunder Client to test:
- POST `/api/auth/register` - Create user
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Get current user

### 3. **Verify Database**
```bash
mysql -u root -p
USE farm_app;
SHOW TABLES;
SELECT * FROM users;
```

## Troubleshooting

### Error: "Can't connect to MySQL server"
**Solution:**
1. Check MySQL is running: `sudo systemctl status mysql` (Linux) or check Services (Windows)
2. Verify `DB_HOST` and `DB_PORT` in `.env`
3. Test connection: `mysql -u root -p`

### Error: "Access denied for user"
**Solution:**
1. Check `DB_USER` and `DB_PASSWORD` in `.env`
2. Reset MySQL password if needed
3. Grant privileges:
   ```sql
   GRANT ALL PRIVILEGES ON farm_app.* TO 'root'@'localhost';
   FLUSH PRIVILEGES;
   ```

### Error: "Unknown database 'farm_app'"
**Solution:**
```bash
mysql -u root -p
CREATE DATABASE farm_app;
EXIT;
```

### Error: "Table doesn't exist"
**Solution:** Tables are created automatically. Make sure the server started successfully and check logs.

## Rollback (If Needed)

If you need to go back to SQLite:
1. Reinstall SQLite: `npm install better-sqlite3`
2. Restore `Config/sqlite.js` from git history
3. Revert changes to import statements
4. Change server.js back to SQLite initialization

## Performance Tips

### Connection Pooling
Already configured! The pool manages 10 concurrent connections by default.

### Indexes (Optional)
For better performance on large datasets:
```sql
CREATE INDEX idx_posts_author ON posts(author);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_comments_post ON comments(post);
CREATE INDEX idx_notifications_recipient ON notifications(recipient);
```

### Monitoring
Monitor active connections:
```sql
SHOW STATUS WHERE Variable_name = 'Threads_connected';
SHOW PROCESSLIST;
```

## Benefits of MySQL Over SQLite

✅ **Better Concurrency** - Handles multiple simultaneous connections
✅ **Production Ready** - Industry standard for web applications
✅ **Remote Access** - Can connect from different servers
✅ **Better Performance** - Optimized for larger datasets
✅ **Advanced Features** - Stored procedures, triggers, views
✅ **Better Tooling** - MySQL Workbench, phpMyAdmin, etc.
✅ **Replication** - Master-slave setup for redundancy

## Additional Resources

- **Migration Guide**: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
- **MySQL Docs**: https://dev.mysql.com/doc/
- **mysql2 Package**: https://github.com/sidorares/node-mysql2

## Support

If you encounter any issues:
1. Check the console logs for detailed error messages
2. Verify MySQL is running and credentials are correct
3. Ensure the database exists
4. Check that the user has proper permissions

---

**Migration completed successfully! 🎉**

Your app is now running on MySQL with modern async/await patterns and improved token management.
