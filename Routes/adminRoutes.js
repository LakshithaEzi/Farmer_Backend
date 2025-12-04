const express = require('express');
const router = express.Router();
const {
  getPendingPosts,
  approvePost,
  rejectPost,
  getAllUsers,
  getStatistics,
  updateUserRole
} = require('../Controllers/adminController');
const { protect, restrictTo } = require('../Middleware/authMiddleware');

// All routes are protected and restricted to admin only
router.use(protect);
router.use(restrictTo('admin'));

// Post moderation
router.get('/posts/pending', getPendingPosts);
router.put('/posts/:id/approve', approvePost);
router.put('/posts/:id/reject', rejectPost);

// User management
router.get('/users', getAllUsers);
router.put('/users/:userId/role', updateUserRole);

// Statistics
router.get('/statistics', getStatistics);

router.get('/debug/all-posts', async (req, res) => {
  const { db } = require('../Config/sqlite');
  const rows = db.prepare('SELECT * FROM posts').all();
  res.json({ posts: rows });
});

module.exports = router;