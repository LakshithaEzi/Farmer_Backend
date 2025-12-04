const express = require("express");
// using SQLite only; removed mongoose
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize SQLite (local DB)
const sqlite = require("./Config/sqlite");
sqlite.init();

const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Farmer Social Platform API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      posts: "/api/posts",
      comments: "/api/comments",
      notifications: "/api/notifications",
      admin: "/api/admin",
    },
  });
});

// Import routes
const authRoutes = require("./Routes/authRoutes");
const postRoutes = require("./Routes/postRoutes");
const commentRoutes = require("./Routes/commentRoutes");
const notificationRoutes = require("./Routes/notificationRoutes");
const adminRoutes = require("./Routes/adminRoutes");

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ message: "Something went wrong!", error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
