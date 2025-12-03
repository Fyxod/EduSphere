const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post("/login", login);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post("/logout", protect, logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get("/me", protect, getMe);

module.exports = router;
