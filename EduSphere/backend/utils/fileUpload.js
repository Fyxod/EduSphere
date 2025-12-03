const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { generateUniqueId, sanitizeFilename } = require("./helpers");
const { AppError } = require("./errors");

// Ensure data directory exists
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Create course directory for videos
 */
const ensureCourseDir = (courseSlug) => {
  const courseDir = path.join(dataDir, courseSlug);
  if (!fs.existsSync(courseDir)) {
    fs.mkdirSync(courseDir, { recursive: true });
  }
  return courseDir;
};

/**
 * Video upload configuration
 */
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Course slug will be added via middleware
    const courseSlug = req.courseSlug || "temp";
    const courseDir = ensureCourseDir(courseSlug);
    cb(null, courseDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = generateUniqueId();
    const ext = path.extname(file.originalname);
    const baseName = sanitizeFilename(path.basename(file.originalname, ext));
    const filename = `${baseName}_${uniqueId}${ext}`;
    req.videoFilename = filename;
    req.videoId = uniqueId;
    cb(null, filename);
  },
});

/**
 * Image upload configuration (for thumbnails/avatars)
 */
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const imagesDir = path.join(dataDir, "images");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = generateUniqueId();
    const ext = path.extname(file.originalname);
    const filename = `${uniqueId}${ext}`;
    cb(null, filename);
  },
});

/**
 * File filter for videos
 */
const videoFilter = (req, file, cb) => {
  const allowedTypes = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError("Only video files are allowed", 400, "INVALID_FILE_TYPE"),
      false
    );
  }
};

/**
 * File filter for images
 */
const imageFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError("Only image files are allowed", 400, "INVALID_FILE_TYPE"),
      false
    );
  }
};

/**
 * Video uploader
 */
const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
});

/**
 * Image uploader
 */
const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Delete file helper
 */
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== "ENOENT") {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Delete course directory
 */
const deleteCourseDir = (courseSlug) => {
  const courseDir = path.join(dataDir, courseSlug);
  return new Promise((resolve, reject) => {
    fs.rm(courseDir, { recursive: true, force: true }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

module.exports = {
  uploadVideo,
  uploadImage,
  ensureCourseDir,
  deleteFile,
  deleteCourseDir,
  dataDir,
};
