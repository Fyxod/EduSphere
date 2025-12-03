const express = require("express");
const router = express.Router();
const {
  getStats,
  getCreatorCourses,
} = require("../controllers/creatorController");
const { protect, isCreator } = require("../middleware/auth");

// All routes require creator authentication
router.use(protect, isCreator);

/**
 * @route   GET /api/v1/creator/stats
 * @desc    Get creator statistics
 * @access  Private (Creator only)
 */
router.get("/stats", getStats);

/**
 * @route   GET /api/v1/creator/courses
 * @desc    Get creator's courses
 * @access  Private (Creator only)
 */
router.get("/courses", getCreatorCourses);

module.exports = router;
