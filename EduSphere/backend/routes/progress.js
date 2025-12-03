const express = require("express");
const router = express.Router();
const {
  completeVideo,
  uncompleteVideo,
  getCourseProgress,
  updateLastWatched,
} = require("../controllers/progressController");
const { protect, isUser } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/v1/progress/complete-video
 * @desc    Mark video as completed
 * @access  Private (User only)
 */
router.post("/complete-video", isUser, completeVideo);

/**
 * @route   DELETE /api/v1/progress/uncomplete-video
 * @desc    Mark video as not completed
 * @access  Private (User only)
 */
router.delete("/uncomplete-video", isUser, uncompleteVideo);

/**
 * @route   PUT /api/v1/progress/last-watched
 * @desc    Update last watched position
 * @access  Private
 */
router.put("/last-watched", updateLastWatched);

/**
 * @route   GET /api/v1/progress/:courseId
 * @desc    Get progress for a course
 * @access  Private
 */
router.get("/:courseId", getCourseProgress);

module.exports = router;
