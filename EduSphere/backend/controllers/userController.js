const User = require("../models/User");
const Purchase = require("../models/Purchase");
const Progress = require("../models/Progress");
const { asyncHandler } = require("../utils/helpers");
const { AppError, errors } = require("../utils/errors");

/**
 * @desc    Get user profile
 * @route   GET /api/v1/users/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "purchasedCourses",
    "title thumbnail courseId"
  );

  // Get completed videos from Progress collection
  const progress = await Progress.find({ user: req.user._id });
  const completedVideos = {};
  progress.forEach((p) => {
    completedVideos[p.course.toString()] = p.completedVideos.map((cv) =>
      cv.video.toString()
    );
  });

  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      socialLinks: user.socialLinks,
      createdAt: user.createdAt,
      purchasedCourses: user.purchasedCourses.map((c) => c._id.toString()),
      completedVideos,
    },
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/users/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, email, bio, avatar, socialLinks } = req.body;

  // Check if email is being changed to one that already exists
  if (email && email !== req.user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(errors.emailExists());
    }
  }

  const updateFields = {};
  if (name) updateFields.name = name;
  if (email) updateFields.email = email;
  if (bio !== undefined) updateFields.bio = bio;
  if (avatar !== undefined) updateFields.avatar = avatar;
  if (socialLinks) updateFields.socialLinks = socialLinks;

  const user = await User.findByIdAndUpdate(req.user._id, updateFields, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      socialLinks: user.socialLinks,
    },
  });
});

/**
 * @desc    Change user password
 * @route   PUT /api/v1/users/password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(
      new AppError(
        "Please provide current and new password",
        400,
        "VALIDATION_ERROR"
      )
    );
  }

  if (newPassword.length < 6) {
    return next(
      new AppError(
        "New password must be at least 6 characters",
        400,
        "VALIDATION_ERROR"
      )
    );
  }

  // Get user with password
  const user = await User.findById(req.user._id).select("+password");

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(
      new AppError("Current password is incorrect", 401, "INVALID_CREDENTIALS")
    );
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: "Password updated successfully",
  });
});

/**
 * @desc    Get user's purchased courses
 * @route   GET /api/v1/users/purchases
 * @access  Private
 */
const getPurchasedCourses = asyncHandler(async (req, res) => {
  const purchases = await Purchase.find({ user: req.user._id })
    .populate({
      path: "course",
      select: "title thumbnail courseId creator price",
      populate: {
        path: "creator",
        select: "name avatar",
      },
    })
    .sort("-createdAt");

  res.json({
    success: true,
    data: {
      purchases: purchases.map((p) => ({
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
      })),
    },
  });
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getPurchasedCourses,
};
