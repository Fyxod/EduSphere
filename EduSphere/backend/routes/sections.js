const express = require("express");
const router = express.Router();
const {
  addSection,
  updateSection,
  deleteSection,
  reorderSections,
} = require("../controllers/sectionController");
const { protect, isCreator } = require("../middleware/auth");

// All routes require creator authentication
router.use(protect, isCreator);

/**
 * @route   POST /api/v1/courses/:courseId/sections
 * @desc    Add section to course
 * @access  Private (Creator only)
 */
router.post("/:courseId/sections", addSection);

/**
 * @route   PUT /api/v1/courses/:courseId/sections/reorder
 * @desc    Reorder sections
 * @access  Private (Creator only)
 */
router.put("/:courseId/sections/reorder", reorderSections);

/**
 * @route   PUT /api/v1/courses/:courseId/sections/:sectionId
 * @desc    Update section
 * @access  Private (Creator only)
 */
router.put("/:courseId/sections/:sectionId", updateSection);

/**
 * @route   DELETE /api/v1/courses/:courseId/sections/:sectionId
 * @desc    Delete section
 * @access  Private (Creator only)
 */
router.delete("/:courseId/sections/:sectionId", deleteSection);

module.exports = router;
