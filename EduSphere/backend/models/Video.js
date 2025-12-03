const mongoose = require("mongoose");
const { generateUniqueId } = require("../utils/helpers");

const videoSchema = new mongoose.Schema(
  {
    videoId: {
      type: String,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Video title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    duration: {
      type: Number,
      required: true,
      default: 0, // Duration in seconds
    },
    url: {
      type: String,
      required: [true, "Video URL is required"],
    },
    filename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      default: "video/mp4",
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate videoId before saving
videoSchema.pre("save", function (next) {
  if (!this.videoId) {
    this.videoId = generateUniqueId();
  }
  next();
});

module.exports = mongoose.model("Video", videoSchema);
