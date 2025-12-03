const express = require("express");
const router = express.Router();
const {
  purchaseCourse,
  getPurchases,
  checkPurchase,
  rateCourse,
} = require("../controllers/purchaseController");
const { protect, isUser } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/v1/purchases
 * @desc    Purchase a course
 * @access  Private (User only)
 */
router.post("/", isUser, purchaseCourse);

/**
 * @route   GET /api/v1/purchases
 * @desc    Get user's purchases
 * @access  Private
 */
router.get("/", getPurchases);

/**
 * @route   GET /api/v1/purchases/:courseId/check
 * @desc    Check if user has purchased a course
 * @access  Private
 */
router.get("/:courseId/check", checkPurchase);

/**
 * @route   POST /api/v1/purchases/:courseId/rate
 * @desc    Rate a purchased course
 * @access  Private (User only)
 */
router.post("/:courseId/rate", isUser, rateCourse);

module.exports = router;
