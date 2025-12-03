const { v4: uuidv4 } = require("uuid");

/**
 * Generate a 7-character unique ID
 */
const generateUniqueId = () => {
  return uuidv4().replace(/-/g, "").substring(0, 7);
};

/**
 * Async handler wrapper to avoid try-catch in every controller
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Format duration in seconds to readable string
 */
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

/**
 * Sanitize filename for storage
 */
const sanitizeFilename = (filename) => {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
};

/**
 * Calculate pagination
 */
const paginate = (page = 1, limit = 12) => {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 12;
  const skip = (pageNum - 1) * limitNum;

  return {
    page: pageNum,
    limit: limitNum,
    skip,
  };
};

/**
 * Build pagination response
 */
const paginateResponse = (totalItems, page, limit) => {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    currentPage: page,
    totalPages,
    totalItems,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

module.exports = {
  generateUniqueId,
  asyncHandler,
  formatDuration,
  sanitizeFilename,
  paginate,
  paginateResponse,
};
