const Course = require("../models/Course");
const Section = require("../models/Section");
const Video = require("../models/Video");
const Purchase = require("../models/Purchase");
const {
  asyncHandler,
  paginate,
  paginateResponse,
} = require("../utils/helpers");
const { AppError, errors } = require("../utils/errors");
const { deleteCourseDir } = require("../utils/fileUpload");

/**
 * @desc    Get all published courses with filters
 * @route   GET /api/v1/courses
 * @access  Public
 */
const getCourses = asyncHandler(async (req, res) => {
  const { category, level, search, sort } = req.query;
  const { page, limit, skip } = paginate(req.query.page, req.query.limit);

  // Build query
  let query = { isPublished: true };

  if (category) {
    query.category = category;
  }

  if (level) {
    query.level = level;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { shortDescription: { $regex: search, $options: "i" } },
    ];
  }

  // Build sort
  let sortOptions = { createdAt: -1 }; // Default: newest
  switch (sort) {
    case "popular":
      sortOptions = { studentsCount: -1 };
      break;
    case "rating":
      sortOptions = { rating: -1 };
      break;
    case "price-low":
      sortOptions = { price: 1 };
      break;
    case "price-high":
      sortOptions = { price: -1 };
      break;
  }

  // Execute query
  const totalItems = await Course.countDocuments(query);

  const courses = await Course.find(query)
    .populate("creator", "name avatar")
    .populate({
      path: "sections",
      select: "title order",
      populate: {
        path: "videos",
        select: "duration",
      },
    })
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);

  // Transform courses with calculated fields
  const transformedCourses = courses.map((course) => {
    let totalDuration = 0;
    let totalVideos = 0;

    const sections = course.sections.map((section) => {
      const sectionDuration = section.videos.reduce(
        (acc, v) => acc + (v.duration || 0),
        0
      );
      totalDuration += sectionDuration;
      totalVideos += section.videos.length;

      return {
        id: section._id,
        title: section.title,
        order: section.order,
        videosCount: section.videos.length,
        totalDuration: sectionDuration,
      };
    });

    return {
      id: course._id,
      courseId: course.courseId,
      title: course.title,
      shortDescription: course.shortDescription,
      description: course.description,
      thumbnail: course.thumbnail,
      price: course.price,
      category: course.category,
      level: course.level,
      rating: course.rating,
      studentsCount: course.studentsCount,
      isPublished: course.isPublished,
      creator: {
        id: course.creator._id,
        name: course.creator.name,
        avatar: course.creator.avatar,
      },
      sections,
      totalDuration,
      totalVideos,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  });

  res.json({
    success: true,
    data: {
      courses: transformedCourses,
      pagination: paginateResponse(totalItems, page, limit),
    },
  });
});

/**
 * @desc    Get single course by ID
 * @route   GET /api/v1/courses/:courseId
 * @access  Public
 */
const getCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findOne({
    $or: [{ _id: req.params.courseId }, { courseId: req.params.courseId }],
  })
    .populate("creator", "name avatar bio")
    .populate({
      path: "sections",
      populate: {
        path: "videos",
        select: "videoId title description duration order",
      },
    });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  // Check if user has purchased this course
  let hasPurchased = false;
  if (req.user) {
    const purchase = await Purchase.findOne({
      user: req.user._id,
      course: course._id,
    });
    hasPurchased = !!purchase;
  }

  let totalDuration = 0;
  let totalVideos = 0;

  const sections = course.sections.map((section) => {
    let sectionDuration = 0;

    const videos = section.videos.map((video) => {
      sectionDuration += video.duration || 0;
      return {
        id: video._id,
        videoId: video.videoId,
        title: video.title,
        description: video.description,
        duration: video.duration,
        order: video.order,
      };
    });

    totalDuration += sectionDuration;
    totalVideos += videos.length;

    return {
      id: section._id,
      title: section.title,
      description: section.description,
      order: section.order,
      totalDuration: sectionDuration,
      videosCount: videos.length,
      videos,
    };
  });

  res.json({
    success: true,
    data: {
      id: course._id,
      courseId: course.courseId,
      title: course.title,
      shortDescription: course.shortDescription,
      description: course.description,
      thumbnail: course.thumbnail,
      price: course.price,
      category: course.category,
      level: course.level,
      rating: course.rating,
      studentsCount: course.studentsCount,
      isPublished: course.isPublished,
      hasPurchased,
      totalDuration,
      totalVideos,
      sectionsCount: sections.length,
      creator: {
        id: course.creator._id,
        name: course.creator.name,
        avatar: course.creator.avatar,
        bio: course.creator.bio,
      },
      sections,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    },
  });
});

/**
 * @desc    Create new course
 * @route   POST /api/v1/courses
 * @access  Private (Creator only)
 */
const createCourse = asyncHandler(async (req, res, next) => {
  const {
    title,
    shortDescription,
    description,
    thumbnail,
    price,
    category,
    level,
    isPublished,
  } = req.body;

  // Validate required fields
  if (
    !title ||
    !shortDescription ||
    !description ||
    price === undefined ||
    !category
  ) {
    return next(
      new AppError(
        "Please provide all required fields",
        400,
        "VALIDATION_ERROR"
      )
    );
  }

  const course = await Course.create({
    title,
    shortDescription,
    description,
    thumbnail:
      thumbnail || "https://placehold.co/600x400?text=Course+Thumbnail",
    price,
    category,
    level: level || "beginner",
    isPublished: isPublished || false,
    creator: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: {
      id: course._id,
      courseId: course.courseId,
      title: course.title,
      shortDescription: course.shortDescription,
      description: course.description,
      thumbnail: course.thumbnail,
      price: course.price,
      category: course.category,
      level: course.level,
      isPublished: course.isPublished,
      creatorId: course.creator,
      sections: [],
      rating: 0,
      studentsCount: 0,
      createdAt: course.createdAt,
    },
  });
});

/**
 * @desc    Update course
 * @route   PUT /api/v1/courses/:courseId
 * @access  Private (Creator only - own course)
 */
const updateCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findOne({
    $or: [{ _id: req.params.courseId }, { courseId: req.params.courseId }],
  });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  // Check ownership
  if (course.creator.toString() !== req.user._id.toString()) {
    return next(errors.forbidden("You can only edit your own courses"));
  }

  const {
    title,
    shortDescription,
    description,
    thumbnail,
    price,
    category,
    level,
    isPublished,
  } = req.body;

  const updateFields = {};
  if (title) updateFields.title = title;
  if (shortDescription) updateFields.shortDescription = shortDescription;
  if (description) updateFields.description = description;
  if (thumbnail !== undefined) updateFields.thumbnail = thumbnail;
  if (price !== undefined) updateFields.price = price;
  if (category) updateFields.category = category;
  if (level) updateFields.level = level;
  if (isPublished !== undefined) updateFields.isPublished = isPublished;

  course = await Course.findByIdAndUpdate(course._id, updateFields, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    data: {
      id: course._id,
      courseId: course.courseId,
      title: course.title,
      shortDescription: course.shortDescription,
      description: course.description,
      thumbnail: course.thumbnail,
      price: course.price,
      category: course.category,
      level: course.level,
      isPublished: course.isPublished,
    },
  });
});

/**
 * @desc    Delete course
 * @route   DELETE /api/v1/courses/:courseId
 * @access  Private (Creator only - own course)
 */
const deleteCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findOne({
    $or: [{ _id: req.params.courseId }, { courseId: req.params.courseId }],
  });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  // Check ownership
  if (course.creator.toString() !== req.user._id.toString()) {
    return next(errors.forbidden("You can only delete your own courses"));
  }

  // Delete all videos
  await Video.deleteMany({ course: course._id });

  // Delete all sections
  await Section.deleteMany({ course: course._id });

  // Delete video files
  try {
    await deleteCourseDir(course.courseId);
  } catch (error) {
    console.error("Error deleting course files:", error);
  }

  // Delete course
  await course.deleteOne();

  res.json({
    success: true,
    message: "Course deleted successfully",
  });
});

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
};
