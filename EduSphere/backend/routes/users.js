const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  getPurchasedCourses,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get("/profile", getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put("/profile", updateProfile);

/**
 * @route   PUT /api/v1/users/password
 * @desc    Change password
 * @access  Private
 */
router.put("/password", changePassword);

/**
 * @route   GET /api/v1/users/purchases
 * @desc    Get user's purchased courses
 * @access  Private
 */
router.get("/purchases", getPurchasedCourses);

module.exports = router;
