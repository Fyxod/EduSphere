const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AppError } = require("../utils/errors");

/**
 * Protect routes - Verify JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Also check for token in query params (for video streaming)
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return next(
        new AppError("Not authorized, no token provided", 401, "UNAUTHORIZED")
      );
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new AppError("User not found", 401, "UNAUTHORIZED"));
      }

      req.user = user;
      next();
    } catch (error) {
      return next(
        new AppError("Not authorized, invalid token", 401, "UNAUTHORIZED")
      );
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Optional auth - Attach user if token exists but don't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Token invalid, but that's okay for optional auth
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorize specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Not authorized", 401, "UNAUTHORIZED"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Role '${req.user.role}' is not authorized to access this resource`,
          403,
          "FORBIDDEN"
        )
      );
    }

    next();
  };
};

/**
 * Check if user is a creator
 */
const isCreator = (req, res, next) => {
  if (!req.user || req.user.role !== "creator") {
    return next(
      new AppError("Only creators can access this resource", 403, "FORBIDDEN")
    );
  }
  next();
};

/**
 * Check if user is a regular user
 */
const isUser = (req, res, next) => {
  if (!req.user || req.user.role !== "user") {
    return next(
      new AppError("Only users can access this resource", 403, "FORBIDDEN")
    );
  }
  next();
};

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

module.exports = {
  protect,
  optionalAuth,
  authorize,
  isCreator,
  isUser,
  generateToken,
};
