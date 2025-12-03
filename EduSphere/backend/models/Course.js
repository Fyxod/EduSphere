const mongoose = require("mongoose");
const { generateUniqueId } = require("../utils/helpers");

const courseSchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    shortDescription: {
      type: String,
      required: [true, "Short description is required"],
      trim: true,
      maxlength: [150, "Short description cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    thumbnail: {
      type: String,
      default: "https://placehold.co/600x400?text=Course+Thumbnail",
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Web Development",
        "Mobile Development",
        "Data Science",
        "Machine Learning",
        "DevOps",
        "Design",
        "Business",
        "Marketing",
      ],
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingsCount: {
      type: Number,
      default: 0,
    },
    studentsCount: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Section",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate courseId before saving
courseSchema.pre("save", function (next) {
  if (!this.courseId) {
    const slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .substring(0, 30);
    this.courseId = `${slug}_${generateUniqueId()}`;
  }
  next();
});

// Virtual for total duration
courseSchema.virtual("totalDuration").get(function () {
  // This will be calculated when sections are populated
  return 0;
});

// Virtual for total videos
courseSchema.virtual("totalVideos").get(function () {
  // This will be calculated when sections are populated
  return 0;
});

// Index for search
courseSchema.index({
  title: "text",
  description: "text",
  shortDescription: "text",
});

module.exports = mongoose.model("Course", courseSchema);
