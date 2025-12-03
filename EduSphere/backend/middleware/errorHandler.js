const { AppError } = require("../utils/errors");

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for development
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", err);
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = new AppError(message, 404, "NOT_FOUND");
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${
      field.charAt(0).toUpperCase() + field.slice(1)
    } already exists`;
    error = new AppError(message, 400, "DUPLICATE_FIELD");
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    const message = messages.join(". ");
    error = new AppError(message, 400, "VALIDATION_ERROR");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = new AppError(message, 401, "UNAUTHORIZED");
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = new AppError(message, 401, "TOKEN_EXPIRED");
  }

  // Multer file upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    const message = "File too large";
    error = new AppError(message, 400, "FILE_TOO_LARGE");
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    const message = "Unexpected file field";
    error = new AppError(message, 400, "UNEXPECTED_FILE");
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      code: error.code || "SERVER_ERROR",
      message: error.message || "Server Error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
