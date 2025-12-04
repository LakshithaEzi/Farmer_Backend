const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const {
  createPost,
  getFeed,
  getPost,
  getMyPosts,
  updatePost,
  deletePost,
  toggleLike,
} = require("../Controllers/postController");
const { protect, optionalAuth } = require("../Middleware/authMiddleware");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Public routes (guests can view)
router.get("/feed", optionalAuth, getFeed);
router.get("/:id", optionalAuth, getPost);

// Protected routes (registered users only)

router.post("/", protect, upload.array("images", 6), createPost);
router.get("/user/my-posts", protect, getMyPosts);
router.put("/:id", protect, updatePost);
router.delete("/:id", protect, deletePost);
router.post("/:id/like", protect, toggleLike);

module.exports = router;
