const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  refresh,
} = require("../Controllers/authController");
const { protect } = require("../Middleware/authMiddleware");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);

// Protected route
router.get("/me", protect, getMe);
router.post("/logout", logout);

module.exports = router;
