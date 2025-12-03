const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Section title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for total duration of section
sectionSchema.virtual("totalDuration").get(function () {
  if (!this.videos || this.videos.length === 0) return 0;
  return this.videos.reduce((total, video) => {
    return total + (video.duration || 0);
  }, 0);
});

// Virtual for video count
sectionSchema.virtual("videosCount").get(function () {
  return this.videos ? this.videos.length : 0;
});

module.exports = mongoose.model("Section", sectionSchema);
