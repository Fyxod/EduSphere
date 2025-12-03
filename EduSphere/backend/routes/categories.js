const express = require("express");
const router = express.Router();

const categories = [
  "Web Development",
  "Mobile Development",
  "Data Science",
  "Machine Learning",
  "DevOps",
  "Design",
  "Business",
  "Marketing",
];

/**
 * @route   GET /api/v1/categories
 * @desc    Get all course categories
 * @access  Public
 */
router.get("/", (req, res) => {
  res.json({
    success: true,
    data: {
      categories,
    },
  });
});

module.exports = router;
