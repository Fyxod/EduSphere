const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    completedVideos: [
      {
        video: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Video",
        },
        completedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastWatched: {
      video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
      timestamp: {
        type: Number,
        default: 0, // Position in seconds
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user-course progress
progressSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model("Progress", progressSchema);
