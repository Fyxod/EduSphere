const Course = require("../models/Course");
const Purchase = require("../models/Purchase");
const User = require("../models/User");
const { asyncHandler } = require("../utils/helpers");

/**
 * @desc    Get creator statistics
 * @route   GET /api/v1/creator/stats
 * @access  Private (Creator only)
 */
const getStats = asyncHandler(async (req, res) => {
  const creatorId = req.user._id;

  // Get all creator's courses
  const courses = await Course.find({ creator: creatorId }).populate({
    path: "sections",
    select: "title description order videos",
    populate: {
      path: "videos",
      select: "title duration order",
    },
  });
  const courseIds = courses.map((c) => c._id);

  const publishedCourses = courses.filter((c) => c.isPublished).length;
  const totalStudents = courses.reduce((acc, c) => acc + c.studentsCount, 0);

  // Calculate average rating
  const ratedCourses = courses.filter((c) => c.rating > 0);
  const averageRating =
    ratedCourses.length > 0
      ? ratedCourses.reduce((acc, c) => acc + c.rating, 0) / ratedCourses.length
      : 0;

  // Get purchases for creator's courses
  const purchases = await Purchase.find({ course: { $in: courseIds } })
    .populate("course", "title")
    .sort("-createdAt");

  const totalRevenue = purchases.reduce((acc, p) => acc + p.amount, 0);

  // Get monthly stats (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const thisMonthPurchases = purchases.filter(
    (p) => new Date(p.createdAt) > thirtyDaysAgo
  );
  const lastMonthPurchases = purchases.filter(
    (p) =>
      new Date(p.createdAt) > sixtyDaysAgo &&
      new Date(p.createdAt) <= thirtyDaysAgo
  );

  const thisMonthStudents = thisMonthPurchases.length;
  const lastMonthStudents = lastMonthPurchases.length;
  const thisMonthRevenue = thisMonthPurchases.reduce(
    (acc, p) => acc + p.amount,
    0
  );
  const lastMonthRevenue = lastMonthPurchases.reduce(
    (acc, p) => acc + p.amount,
    0
  );

  const studentsChange =
    lastMonthStudents > 0
      ? ((thisMonthStudents - lastMonthStudents) / lastMonthStudents) * 100
      : thisMonthStudents > 0
      ? 100
      : 0;

  const revenueChange =
    lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : thisMonthRevenue > 0
      ? 100
      : 0;

  // Recent purchases
  const recentPurchases = purchases.slice(0, 10).map((p) => ({
    id: p._id,
    courseId: p.course._id,
    courseTitle: p.course.title,
    amount: p.amount,
    purchasedAt: p.createdAt,
  }));

  res.json({
    success: true,
    data: {
      totalCourses: courses.length,
      publishedCourses,
      totalStudents,
      totalRevenue,
      averageRating: Math.round(averageRating * 10) / 10,
      monthlyStats: {
        students: thisMonthStudents,
        revenue: thisMonthRevenue,
        studentsChange: Math.round(studentsChange),
        revenueChange: Math.round(revenueChange),
      },
      recentPurchases,
    },
  });
});

/**
 * @desc    Get creator's courses
 * @route   GET /api/v1/creator/courses
 * @access  Private (Creator only)
 */
const getCreatorCourses = asyncHandler(async (req, res) => {
  const { status, sort } = req.query;

  let query = { creator: req.user._id };

  if (status === "draft") {
    query.isPublished = false;
  } else if (status === "published") {
    query.isPublished = true;
  }

  let sortOptions = { createdAt: -1 };
  if (sort === "students") {
    sortOptions = { studentsCount: -1 };
  } else if (sort === "revenue") {
    // Will sort after aggregation
  }

  const courses = await Course.find(query)
    .populate({
      path: "sections",
      select: "title description order videos",
      populate: {
        path: "videos",
        select: "title duration order",
      },
    })
    .sort(sortOptions);

  // Get revenue for each course
  const courseIds = courses.map((c) => c._id);
  const purchases = await Purchase.find({ course: { $in: courseIds } });

  const revenueMap = {};
  purchases.forEach((p) => {
    const key = p.course.toString();
    revenueMap[key] = (revenueMap[key] || 0) + p.amount;
  });

  const result = courses.map((course) => {
    let totalDuration = 0;

    const sections = course.sections.map((section) => {
      const sectionVideos = (section.videos || []).map((video) => {
        if (!video || typeof video !== "object" || !video.title) {
          return null;
        }
        return {
          id: video._id,
          title: video.title,
          duration: video.duration || 0,
          order: video.order,
        };
      });

      const filteredVideos = sectionVideos.filter(Boolean);
      const sectionDuration = filteredVideos.reduce(
        (acc, video) => acc + (video?.duration || 0),
        0
      );
      totalDuration += sectionDuration;

      return {
        id: section._id,
        title: section.title,
        description: section.description,
        order: section.order,
        videos: filteredVideos,
        videosCount: filteredVideos.length,
        totalDuration: sectionDuration,
      };
    });

    const videosCount = sections.reduce(
      (acc, section) => acc + section.videosCount,
      0
    );

    return {
      id: course._id,
      courseId: course.courseId,
      title: course.title,
      thumbnail: course.thumbnail,
      price: course.price,
      isPublished: course.isPublished,
      studentsCount: course.studentsCount,
      rating: course.rating,
      revenue: revenueMap[course._id.toString()] || 0,
      sectionsCount: sections.length,
      videosCount,
      totalDuration,
      sections,
      createdAt: course.createdAt,
    };
  });

  // Sort by revenue if requested
  if (sort === "revenue") {
    result.sort((a, b) => b.revenue - a.revenue);
  }

  res.json({
    success: true,
    data: {
      courses: result,
    },
  });
});

module.exports = {
  getStats,
  getCreatorCourses,
};
