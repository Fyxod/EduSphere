const Purchase = require("../models/Purchase");
const Course = require("../models/Course");
const User = require("../models/User");
const Progress = require("../models/Progress");
const { asyncHandler } = require("../utils/helpers");
const { AppError, errors } = require("../utils/errors");

/**
 * @desc    Purchase a course
 * @route   POST /api/v1/purchases
 * @access  Private (User only)
 */
const purchaseCourse = asyncHandler(async (req, res, next) => {
  const { courseId, paymentMethodId } = req.body;

  if (!courseId) {
    return next(new AppError("Course ID is required", 400, "VALIDATION_ERROR"));
  }

  // Find the course
  const course = await Course.findOne({
    $or: [{ _id: courseId }, { courseId: courseId }],
  });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  if (course.creator.toString() === req.user._id.toString()) {
    return next(
      new AppError(
        "Creators cannot purchase their own courses",
        400,
        "CREATOR_CANNOT_PURCHASE"
      )
    );
  }

  if (!course.isPublished) {
    return next(
      new AppError(
        "This course is not available for purchase",
        400,
        "COURSE_NOT_AVAILABLE"
      )
    );
  }

  // Check if already purchased
  const existingPurchase = await Purchase.findOne({
    user: req.user._id,
    course: course._id,
  });

  if (existingPurchase) {
    return next(errors.alreadyPurchased());
  }

  // Create purchase (fake payment - always succeeds)
  const purchase = await Purchase.create({
    user: req.user._id,
    course: course._id,
    amount: course.price,
    paymentMethodId: paymentMethodId || "fake_payment",
    status: "completed",
  });

  // Add course to user's purchased courses
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { purchasedCourses: course._id },
  });

  // Increment course students count
  await Course.findByIdAndUpdate(course._id, {
    $inc: { studentsCount: 1 },
  });

  // Create empty progress record
  await Progress.create({
    user: req.user._id,
    course: course._id,
    completedVideos: [],
  });

  res.status(201).json({
    success: true,
    data: {
      id: purchase._id,
      userId: req.user._id,
      courseId: course._id,
      amount: purchase.amount,
      purchasedAt: purchase.createdAt,
    },
  });
});

/**
 * @desc    Get user's purchases
 * @route   GET /api/v1/purchases
 * @access  Private
 */
const getPurchases = asyncHandler(async (req, res) => {
  const purchases = await Purchase.find({ user: req.user._id })
    .populate({
      path: "course",
      select: "title thumbnail courseId creator price",
      populate: [
        {
          path: "creator",
          select: "name avatar",
        },
        {
          path: "sections",
          populate: { path: "videos" },
        },
      ],
    })
    .sort("-createdAt");

  // Get progress for each purchase
  const purchasesWithProgress = await Promise.all(
    purchases.map(async (p) => {
      // Calculate total videos in the course
      let totalVideos = 0;
      if (p.course.sections) {
        p.course.sections.forEach((section) => {
          totalVideos += section.videos ? section.videos.length : 0;
        });
      }

      // Get progress for this course
      const progress = await Progress.findOne({
        user: req.user._id,
        course: p.course._id,
      });

      const completedVideos = progress?.completedVideos || [];
      const percentage =
        totalVideos > 0
          ? Math.round((completedVideos.length / totalVideos) * 100)
          : 0;

      return {
        id: p._id,
        courseId: p.course._id,
        amount: p.amount,
        purchasedAt: p.createdAt,
        course: {
          id: p.course._id,
          courseId: p.course.courseId,
          title: p.course.title,
          thumbnail: p.course.thumbnail,
          creator: {
            id: p.course.creator._id,
            name: p.course.creator.name,
          },
        },
        progress: {
          completedVideos: completedVideos.map((cv) => cv.video.toString()),
          percentage,
        },
      };
    })
  );

  res.json({
    success: true,
    data: {
      purchases: purchasesWithProgress,
    },
  });
});

/**
 * @desc    Check if user has purchased a course
 * @route   GET /api/v1/purchases/:courseId/check
 * @access  Private
 */
const checkPurchase = asyncHandler(async (req, res) => {
  const course = await Course.findOne({
    $or: [{ _id: req.params.courseId }, { courseId: req.params.courseId }],
  });

  if (!course) {
    return res.json({
      success: true,
      data: {
        hasPurchased: false,
        purchasedAt: null,
        rating: null,
      },
    });
  }

  const purchase = await Purchase.findOne({
    user: req.user._id,
    course: course._id,
  });

  res.json({
    success: true,
    data: {
      hasPurchased: !!purchase,
      purchasedAt: purchase ? purchase.createdAt : null,
      rating: purchase ? purchase.rating : null,
    },
  });
});

/**
 * @desc    Rate a purchased course
 * @route   POST /api/v1/purchases/:courseId/rate
 * @access  Private (User only)
 */
const rateCourse = asyncHandler(async (req, res, next) => {
  const { rating } = req.body;
  const { courseId } = req.params;

  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    return next(
      new AppError("Rating must be between 1 and 5", 400, "VALIDATION_ERROR")
    );
  }

  // Find the course
  const course = await Course.findOne({
    $or: [{ _id: courseId }, { courseId: courseId }],
  });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  // Find the purchase
  const purchase = await Purchase.findOne({
    user: req.user._id,
    course: course._id,
  });

  if (!purchase) {
    return next(
      new AppError(
        "You must purchase this course to rate it",
        403,
        "NOT_PURCHASED"
      )
    );
  }

  const previousRating = purchase.rating;
  const hadPreviousRating = previousRating !== null;

  // Update purchase with rating
  purchase.rating = rating;
  purchase.ratedAt = new Date();
  await purchase.save();

  // Update course average rating
  if (hadPreviousRating) {
    // Update existing rating - recalculate average
    const newTotal =
      course.rating * course.ratingsCount - previousRating + rating;
    course.rating = newTotal / course.ratingsCount;
  } else {
    // New rating
    const newTotal = course.rating * course.ratingsCount + rating;
    course.ratingsCount += 1;
    course.rating = newTotal / course.ratingsCount;
  }
  await course.save();

  res.json({
    success: true,
    data: {
      rating: purchase.rating,
      courseRating: course.rating,
      ratingsCount: course.ratingsCount,
    },
  });
});

module.exports = {
  purchaseCourse,
  getPurchases,
  checkPurchase,
  rateCourse,
};
