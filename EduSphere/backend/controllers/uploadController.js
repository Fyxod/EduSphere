const path = require("path");
const { asyncHandler } = require("../utils/helpers");
const { AppError } = require("../utils/errors");

/**
 * @desc    Upload image (thumbnail or avatar)
 * @route   POST /api/v1/upload/image
 * @access  Private
 */
const uploadImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(
      new AppError("Please upload an image file", 400, "VALIDATION_ERROR")
    );
  }

  const imageUrl = `/data/images/${req.file.filename}`;

  res.json({
    success: true,
    data: {
      url: imageUrl,
      key: req.file.filename,
    },
  });
});

module.exports = {
  uploadImage,
};
