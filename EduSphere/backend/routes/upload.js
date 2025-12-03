const express = require("express");
const router = express.Router();
const { uploadImage } = require("../controllers/uploadController");
const { protect } = require("../middleware/auth");
const { uploadImage: imageUploader } = require("../utils/fileUpload");

/**
 * @route   POST /api/v1/upload/image
 * @desc    Upload image (thumbnail or avatar)
 * @access  Private
 */
router.post("/image", protect, imageUploader.single("file"), uploadImage);

module.exports = router;
