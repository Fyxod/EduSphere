const express = require("express");
const router = express.Router();
const {
  streamVideo,
  streamVideoSegment,
  getVideoMetadata,
} = require("../controllers/videoController");
const { protect } = require("../middleware/auth");

router.use(protect);

// Primary progressive stream endpoint with HTTP range support
router.get("/stream/:videoId", streamVideo);

// Explicit fragment endpoint driven by start/end byte offsets
router.get("/segments/:videoId", streamVideoSegment);

// Lightweight metadata for video playback initialization
router.get("/metadata/:videoId", getVideoMetadata);

module.exports = router;
