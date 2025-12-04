const express = require('express');
const router = express.Router();
const {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  toggleLike
} = require('../Controllers/commentController');
const { protect, optionalAuth } = require('../Middleware/authMiddleware');

// Public route (guests can view comments)
router.get('/post/:postId', optionalAuth, getComments);

// Protected routes (registered users only)
router.post('/', protect, createComment);
router.put('/:id', protect, updateComment);
router.delete('/:id', protect, deleteComment);
router.post('/:id/like', protect, toggleLike);

module.exports = router;