const express = require("express");
const router = express.Router();
const {
  addVideo,
  updateVideo,
  deleteVideo,
  streamVideo,
} = require("../controllers/videoController");
const { protect, isCreator } = require("../middleware/auth");
const { uploadVideo, ensureCourseDir } = require("../utils/fileUpload");
const Course = require("../models/Course");

// Middleware to set course slug for video upload
const setCourseSlug = async (req, res, next) => {
  try {
    const course = await Course.findOne({
      $or: [{ _id: req.params.courseId }, { courseId: req.params.courseId }],
    });

    if (course) {
      req.courseSlug = course.courseId;
      ensureCourseDir(course.courseId);
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/courses/:courseId/sections/:sectionId/videos
 * @desc    Add video to section
 * @access  Private (Creator only)
 */
router.post(
  "/:courseId/sections/:sectionId/videos",
  protect,
  isCreator,
  setCourseSlug,
  uploadVideo.single("video"),
  addVideo
);

/**
 * @route   PUT /api/v1/courses/:courseId/sections/:sectionId/videos/:videoId
 * @desc    Update video metadata
 * @access  Private (Creator only)
 */
router.put(
  "/:courseId/sections/:sectionId/videos/:videoId",
  protect,
  isCreator,
  updateVideo
);

/**
 * @route   DELETE /api/v1/courses/:courseId/sections/:sectionId/videos/:videoId
 * @desc    Delete video
 * @access  Private (Creator only)
 */
router.delete(
  "/:courseId/sections/:sectionId/videos/:videoId",
  protect,
  isCreator,
  deleteVideo
);

module.exports = router;
