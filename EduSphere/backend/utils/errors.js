/**
 * Custom error class with status code and error code
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = "SERVER_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create common error instances
 */
const errors = {
  notFound: (resource = "Resource") =>
    new AppError(`${resource} not found`, 404, "NOT_FOUND"),

  unauthorized: (message = "Not authorized") =>
    new AppError(message, 401, "UNAUTHORIZED"),

  forbidden: (message = "Access forbidden") =>
    new AppError(message, 403, "FORBIDDEN"),

  badRequest: (message = "Bad request") =>
    new AppError(message, 400, "BAD_REQUEST"),

  validation: (message = "Validation failed") =>
    new AppError(message, 400, "VALIDATION_ERROR"),

  conflict: (message = "Resource already exists") =>
    new AppError(message, 409, "CONFLICT"),

  emailExists: () =>
    new AppError(
      "An account with this email already exists",
      400,
      "EMAIL_EXISTS"
    ),

  invalidCredentials: () =>
    new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS"),

  courseNotPurchased: () =>
    new AppError(
      "You have not purchased this course",
      403,
      "COURSE_NOT_PURCHASED"
    ),

  alreadyPurchased: () =>
    new AppError(
      "You have already purchased this course",
      400,
      "ALREADY_PURCHASED"
    ),
};

module.exports = { AppError, errors };
