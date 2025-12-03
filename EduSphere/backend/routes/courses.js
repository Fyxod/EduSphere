const express = require("express");
const router = express.Router();
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/courseController");
const { protect, optionalAuth, isCreator } = require("../middleware/auth");

/**
 * @route   GET /api/v1/courses
 * @desc    Get all published courses
 * @access  Public
 */
router.get("/", getCourses);

/**
 * @route   POST /api/v1/courses
 * @desc    Create new course
 * @access  Private (Creator only)
 */
router.post("/", protect, isCreator, createCourse);

/**
 * @route   GET /api/v1/courses/:courseId
 * @desc    Get single course
 * @access  Public (with optional auth for purchase check)
 */
router.get("/:courseId", optionalAuth, getCourse);

/**
 * @route   PUT /api/v1/courses/:courseId
 * @desc    Update course
 * @access  Private (Creator only - own course)
 */
router.put("/:courseId", protect, isCreator, updateCourse);

/**
 * @route   DELETE /api/v1/courses/:courseId
 * @desc    Delete course
 * @access  Private (Creator only - own course)
 */
router.delete("/:courseId", protect, isCreator, deleteCourse);

module.exports = router;
