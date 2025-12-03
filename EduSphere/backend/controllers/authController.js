const User = require("../models/User");
const { generateToken } = require("../middleware/auth");
const { asyncHandler } = require("../utils/helpers");
const { AppError, errors } = require("../utils/errors");

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return next(
      new AppError(
        "Please provide name, email and password",
        400,
        "VALIDATION_ERROR"
      )
    );
  }

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(errors.emailExists());
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || "user",
  });

  // Generate token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      token,
    },
  });
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password, role } = req.body;

  // Validate required fields
  if (!email || !password) {
    return next(
      new AppError("Please provide email and password", 400, "VALIDATION_ERROR")
    );
  }

  // Find user and include password
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(errors.invalidCredentials());
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(errors.invalidCredentials());
  }

  // Check role if specified
  if (role && user.role !== role) {
    return next(
      new AppError(
        `No ${role} account found with this email`,
        401,
        "INVALID_CREDENTIALS"
      )
    );
  }

  // Generate token
  const token = generateToken(user._id);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      token,
    },
  });
});

/**
 * @desc    Logout user (client-side token removal)
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Since we're using JWT, logout is handled client-side
  // This endpoint just confirms the logout
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
      },
    },
  });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
};
