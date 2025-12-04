const User = require("../Models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../Config/sqlite"); // has run/get/all

function generateAccessToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || "your_secret_key_here",
    { expiresIn: "15m" }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString("hex"); // store this server-side
}

// In login handler (after verifying password):
// (removed stray example snippet)

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || "your_secret_key_here",
    { expiresIn: "7d" }
  );
};

// Register User
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide username, email, and password",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error registering user",
      error: error.message,
    });
  }
};

// controllers/authController.js
exports.refresh = (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "No refresh token" });

  const row = db.get("SELECT * FROM refresh_tokens WHERE token = ? LIMIT 1", [
    token,
  ]);
  if (!row)
    return res
      .status(401)
      .json({ success: false, message: "Invalid refresh token" });

  if (new Date(row.expiresAt) < new Date()) {
    // token expired - delete row and ask to login again
    db.run("DELETE FROM refresh_tokens WHERE token = ?", [token]);
    res.clearCookie("refreshToken");
    return res
      .status(401)
      .json({ success: false, message: "Refresh token expired" });
  }

  // issue new access token
  const newAccessToken = generateAccessToken(row.user_id);
  res.json({ token: newAccessToken });
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isPasswordValid = user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    // Generate short-lived access token and long-lived refresh token
    const accessToken = generateAccessToken(user.id || user._id);

    // create refresh token, store in DB
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    db.run(
      "INSERT INTO refresh_tokens (token, user_id, expiresAt, createdAt) VALUES (?, ?, ?, ?)",
      [refreshToken, user.id || user._id, expiresAt, new Date().toISOString()]
    );

    // set cookie (HttpOnly)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token: accessToken,
      user: {
        id: user.id || user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

// Get Current User
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user && user.password) delete user.password;

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

// Logout User
exports.logout = (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) db.run("DELETE FROM refresh_tokens WHERE token = ?", [token]);
  res.clearCookie("refreshToken");
  res.json({ success: true, message: "Logged out" });
};
