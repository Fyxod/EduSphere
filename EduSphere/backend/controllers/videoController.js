const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffprobeInstaller = require("@ffprobe-installer/ffprobe");
const Video = require("../models/Video");
const Section = require("../models/Section");
const Course = require("../models/Course");
const Purchase = require("../models/Purchase");
const { asyncHandler } = require("../utils/helpers");
const { AppError, errors } = require("../utils/errors");
const { ensureCourseDir, deleteFile, dataDir } = require("../utils/fileUpload");

ffmpeg.setFfprobePath(ffprobeInstaller.path);

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_MIME_TYPE = "video/mp4";

const probeVideoDuration = (filePath) =>
  new Promise((resolve) => {
    if (!filePath) {
      resolve(0);
      return;
    }

    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error("Failed to probe video duration", err);
        resolve(0);
        return;
      }

      const rawDuration = metadata?.format?.duration;
      const duration = Number.isFinite(rawDuration)
        ? rawDuration
        : Number(rawDuration);
      if (Number.isFinite(duration) && duration > 0) {
        resolve(duration);
      } else {
        resolve(0);
      }
    });
  });

const resolveVideoResource = async (videoIdentifier, user) => {
  const video = await Video.findOne({
    $or: [{ _id: videoIdentifier }, { videoId: videoIdentifier }],
  }).populate("course");

  if (!video) {
    throw errors.notFound("Video");
  }

  const course = video.course;

  const isCreator = course.creator.toString() === user._id.toString();
  if (!isCreator) {
    const purchase = await Purchase.findOne({
      user: user._id,
      course: course._id,
    });

    if (!purchase) {
      throw errors.courseNotPurchased();
    }
  }

  const filePath = path.join(dataDir, course.courseId, video.filename);

  if (!fs.existsSync(filePath)) {
    throw errors.notFound("Video file");
  }

  const stat = fs.statSync(filePath);

  return {
    video,
    course,
    filePath,
    fileSize: stat.size,
  };
};

/**
 * @desc    Add video to section
 * @route   POST /api/v1/courses/:courseId/sections/:sectionId/videos
 * @access  Private (Creator only - own course)
 */
const addVideo = asyncHandler(async (req, res, next) => {
  const course = await Course.findOne({
    $or: [{ _id: req.params.courseId }, { courseId: req.params.courseId }],
  });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  // Check ownership
  if (course.creator.toString() !== req.user._id.toString()) {
    return next(
      errors.forbidden("You can only add videos to your own courses")
    );
  }

  const section = await Section.findOne({
    _id: req.params.sectionId,
    course: course._id,
  });

  if (!section) {
    return next(errors.notFound("Section"));
  }

  if (!req.file) {
    return next(
      new AppError("Please upload a video file", 400, "VALIDATION_ERROR")
    );
  }

  const { title, description, order } = req.body;

  if (!title) {
    return next(
      new AppError("Video title is required", 400, "VALIDATION_ERROR")
    );
  }

  let providedDuration = 0;
  if (req.body.duration !== undefined) {
    const parsedDuration = Number.parseFloat(req.body.duration);
    if (Number.isFinite(parsedDuration) && parsedDuration > 0) {
      providedDuration = parsedDuration;
    }
  }

  let durationSeconds = providedDuration;
  if (durationSeconds <= 0) {
    const filePath =
      req.file?.path || path.join(dataDir, course.courseId, req.videoFilename);
    durationSeconds = await probeVideoDuration(filePath);
  }

  const roundedDuration = Number.isFinite(durationSeconds)
    ? Math.max(0, Math.round(durationSeconds))
    : 0;

  // Get the next order if not provided
  let videoOrder = order ? parseInt(order, 10) : undefined;
  if (videoOrder === undefined) {
    const lastVideo = await Video.findOne({ section: section._id }).sort(
      "-order"
    );
    videoOrder = lastVideo ? lastVideo.order + 1 : 1;
  }

  // Create video record
  const video = await Video.create({
    title,
    description: description || "",
    duration: roundedDuration,
    url: `/data/${course.courseId}/${req.videoFilename}`,
    filename: req.videoFilename,
    mimeType: req.file?.mimetype || "video/mp4",
    order: videoOrder,
    section: section._id,
    course: course._id,
  });

  // Add video to section
  section.videos.push(video._id);
  await section.save();

  res.status(201).json({
    success: true,
    data: {
      id: video._id,
      videoId: video.videoId,
      title: video.title,
      description: video.description,
      duration: video.duration,
      url: video.url,
      order: video.order,
      sectionId: section._id,
    },
  });
});

/**
 * @desc    Update video metadata
 * @route   PUT /api/v1/courses/:courseId/sections/:sectionId/videos/:videoId
 * @access  Private (Creator only - own course)
 */
const updateVideo = asyncHandler(async (req, res, next) => {
  const course = await Course.findOne({
    $or: [{ _id: req.params.courseId }, { courseId: req.params.courseId }],
  });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  // Check ownership
  if (course.creator.toString() !== req.user._id.toString()) {
    return next(
      errors.forbidden("You can only update videos in your own courses")
    );
  }

  let video = await Video.findOne({
    _id: req.params.videoId,
    course: course._id,
  });

  if (!video) {
    return next(errors.notFound("Video"));
  }

  const { title, description, order } = req.body;

  const updateFields = {};
  if (title) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;
  if (order !== undefined) updateFields.order = order;

  video = await Video.findByIdAndUpdate(video._id, updateFields, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    data: {
      id: video._id,
      videoId: video.videoId,
      title: video.title,
      description: video.description,
      duration: video.duration,
      url: video.url,
      order: video.order,
    },
  });
});

/**
 * @desc    Delete video
 * @route   DELETE /api/v1/courses/:courseId/sections/:sectionId/videos/:videoId
 * @access  Private (Creator only - own course)
 */
const deleteVideo = asyncHandler(async (req, res, next) => {
  const course = await Course.findOne({
    $or: [{ _id: req.params.courseId }, { courseId: req.params.courseId }],
  });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  // Check ownership
  if (course.creator.toString() !== req.user._id.toString()) {
    return next(
      errors.forbidden("You can only delete videos from your own courses")
    );
  }

  const video = await Video.findOne({
    _id: req.params.videoId,
    course: course._id,
  });

  if (!video) {
    return next(errors.notFound("Video"));
  }

  // Delete video file
  try {
    const filePath = path.join(dataDir, course.courseId, video.filename);
    await deleteFile(filePath);
  } catch (error) {
    console.error("Error deleting video file:", error);
  }

  // Remove video from section
  await Section.findByIdAndUpdate(video.section, {
    $pull: { videos: video._id },
  });

  // Delete video record
  await video.deleteOne();

  res.json({
    success: true,
    message: "Video deleted successfully",
  });
});

/**
 * @desc    Stream video
 * @route   GET /api/v1/videos/:videoId/stream
 * @access  Private (Must have purchased course)
 */
const streamVideo = asyncHandler(async (req, res, next) => {
  const { video, filePath, fileSize } = await resolveVideoResource(
    req.params.videoId,
    req.user
  );

  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    let start = parseInt(parts[0], 10);
    let end = parts[1] ? parseInt(parts[1], 10) : undefined;

    start = Number.isFinite(start) && start >= 0 ? start : 0;
    if (!Number.isFinite(end) || end < start) {
      end = Math.min(start + DEFAULT_CHUNK_SIZE - 1, fileSize - 1);
    } else {
      end = Math.min(end, fileSize - 1);
    }

    const chunkSize = end - start + 1;

    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": video.mimeType || DEFAULT_MIME_TYPE,
      "Cache-Control": "no-store",
    };

    res.writeHead(206, head);
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  const head = {
    "Content-Length": fileSize,
    "Content-Type": video.mimeType || DEFAULT_MIME_TYPE,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
  };

  res.writeHead(200, head);
  fs.createReadStream(filePath).pipe(res);
});

const streamVideoSegment = asyncHandler(async (req, res, next) => {
  const { video, filePath, fileSize } = await resolveVideoResource(
    req.params.videoId,
    req.user
  );

  let start = Number.parseInt(req.query.start, 10);
  let end = Number.parseInt(req.query.end, 10);

  start = Number.isFinite(start) && start >= 0 ? start : 0;
  if (!Number.isFinite(end) || end < start) {
    end = Math.min(start + DEFAULT_CHUNK_SIZE - 1, fileSize - 1);
  } else {
    end = Math.min(end, fileSize - 1);
  }

  if (start >= fileSize) {
    start = Math.max(0, fileSize - DEFAULT_CHUNK_SIZE);
    end = fileSize - 1;
  }

  const chunkSize = end - start + 1;

  const head = {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": video.mimeType || DEFAULT_MIME_TYPE,
    "Cache-Control": "no-store",
  };

  res.writeHead(206, head);
  fs.createReadStream(filePath, { start, end }).pipe(res);
});

const getVideoMetadata = asyncHandler(async (req, res, next) => {
  const { video, fileSize } = await resolveVideoResource(
    req.params.videoId,
    req.user
  );

  res.json({
    success: true,
    data: {
      metadata: {
        id: video._id,
        videoId: video.videoId,
        title: video.title,
        duration: video.duration,
        size: fileSize,
        mimeType: video.mimeType || DEFAULT_MIME_TYPE,
        filename: video.filename,
      },
    },
  });
});

module.exports = {
  addVideo,
  updateVideo,
  deleteVideo,
  streamVideo,
  streamVideoSegment,
  getVideoMetadata,
};
