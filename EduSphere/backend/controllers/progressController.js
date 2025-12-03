const Progress = require("../models/Progress");
const Course = require("../models/Course");
const Video = require("../models/Video");
const Section = require("../models/Section");
const Purchase = require("../models/Purchase");
const { asyncHandler } = require("../utils/helpers");
const { AppError, errors } = require("../utils/errors");

/**
 * @desc    Mark video as completed
 * @route   POST /api/v1/progress/complete-video
 * @access  Private (User only)
 */
const completeVideo = asyncHandler(async (req, res, next) => {
  const { courseId, videoId } = req.body;

  if (!courseId || !videoId) {
    return next(
      new AppError(
        "Course ID and Video ID are required",
        400,
        "VALIDATION_ERROR"
      )
    );
  }

  // Find course
  const course = await Course.findOne({
    $or: [{ _id: courseId }, { courseId: courseId }],
  }).populate({
    path: "sections",
    populate: { path: "videos" },
  });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  // Check if purchased
  const purchase = await Purchase.findOne({
    user: req.user._id,
    course: course._id,
  });

  if (!purchase) {
    return next(errors.courseNotPurchased());
  }

  // Find video
  const video = await Video.findOne({
    $or: [{ _id: videoId }, { videoId: videoId }],
    course: course._id,
  });

  if (!video) {
    return next(errors.notFound("Video"));
  }

  // Get or create progress
  let progress = await Progress.findOne({
    user: req.user._id,
    course: course._id,
  });

  if (!progress) {
    progress = await Progress.create({
      user: req.user._id,
      course: course._id,
      completedVideos: [],
    });
  }

  // Check if already completed
  const alreadyCompleted = progress.completedVideos.some(
    (cv) => cv.video.toString() === video._id.toString()
  );

  if (!alreadyCompleted) {
    progress.completedVideos.push({
      video: video._id,
      completedAt: new Date(),
    });
    await progress.save();
  }

  // Calculate progress
  let totalVideos = 0;
  course.sections.forEach((section) => {
    totalVideos += section.videos.length;
  });

  const completedCount = progress.completedVideos.length;
  const percentage =
    totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0;

  res.json({
    success: true,
    data: {
      courseId: course._id,
      videoId: video._id,
      completedAt: new Date().toISOString(),
      courseProgress: {
        completedVideos: completedCount,
        totalVideos,
        percentage,
      },
    },
  });
});

/**
 * @desc    Mark video as not completed
 * @route   DELETE /api/v1/progress/uncomplete-video
 * @access  Private (User only)
 */
const uncompleteVideo = asyncHandler(async (req, res, next) => {
  const { courseId, videoId } = req.body;

  if (!courseId || !videoId) {
    return next(
      new AppError(
        "Course ID and Video ID are required",
        400,
        "VALIDATION_ERROR"
      )
    );
  }

  // Find course
  const course = await Course.findOne({
    $or: [{ _id: courseId }, { courseId: courseId }],
  });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  // Find video
  const video = await Video.findOne({
    $or: [{ _id: videoId }, { videoId: videoId }],
    course: course._id,
  });

  if (!video) {
    return next(errors.notFound("Video"));
  }

  // Update progress
  await Progress.findOneAndUpdate(
    { user: req.user._id, course: course._id },
    { $pull: { completedVideos: { video: video._id } } }
  );

  res.json({
    success: true,
    message: "Video marked as incomplete",
  });
});

/**
 * @desc    Get progress for a course
 * @route   GET /api/v1/progress/:courseId
 * @access  Private
 */
const getCourseProgress = asyncHandler(async (req, res) => {
  // Find course
  const course = await Course.findOne({
    $or: [{ _id: req.params.courseId }, { courseId: req.params.courseId }],
  }).populate({
    path: "sections",
    populate: { path: "videos" },
  });

  if (!course) {
    return res.json({
      success: true,
      data: {
        courseId: req.params.courseId,
        completedVideos: [],
        totalVideos: 0,
        percentage: 0,
        lastWatched: null,
      },
    });
  }

  // Get progress
  const progress = await Progress.findOne({
    user: req.user._id,
    course: course._id,
  });

  // Calculate totals
  let totalVideos = 0;
  course.sections.forEach((section) => {
    totalVideos += section.videos.length;
  });

  if (!progress) {
    return res.json({
      success: true,
      data: {
        courseId: course._id,
        completedVideos: [],
        totalVideos,
        percentage: 0,
        lastWatched: null,
      },
    });
  }

  const completedVideoIds = progress.completedVideos.map((cv) =>
    cv.video.toString()
  );
  const percentage =
    totalVideos > 0
      ? Math.round((completedVideoIds.length / totalVideos) * 100)
      : 0;

  res.json({
    success: true,
    data: {
      courseId: course._id,
      completedVideos: completedVideoIds,
      totalVideos,
      percentage,
      lastWatched: progress.lastWatched
        ? {
            videoId: progress.lastWatched.video,
            timestamp: progress.lastWatched.timestamp,
          }
        : null,
    },
  });
});

/**
 * @desc    Update last watched position
 * @route   PUT /api/v1/progress/last-watched
 * @access  Private
 */
const updateLastWatched = asyncHandler(async (req, res, next) => {
  const { courseId, videoId, timestamp } = req.body;

  if (!courseId || !videoId) {
    return next(
      new AppError(
        "Course ID and Video ID are required",
        400,
        "VALIDATION_ERROR"
      )
    );
  }

  const course = await Course.findOne({
    $or: [{ _id: courseId }, { courseId: courseId }],
  });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  const video = await Video.findOne({
    $or: [{ _id: videoId }, { videoId: videoId }],
    course: course._id,
  });

  if (!video) {
    return next(errors.notFound("Video"));
  }

  await Progress.findOneAndUpdate(
    { user: req.user._id, course: course._id },
    {
      lastWatched: {
        video: video._id,
        timestamp: timestamp || 0,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  res.json({
    success: true,
    message: "Last watched position updated",
  });
});

module.exports = {
  completeVideo,
  uncompleteVideo,
  getCourseProgress,
  updateLastWatched,
};
