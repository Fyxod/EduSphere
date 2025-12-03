const Section = require("../models/Section");
const Course = require("../models/Course");
const Video = require("../models/Video");
const { asyncHandler } = require("../utils/helpers");
const { AppError, errors } = require("../utils/errors");

/**
 * @desc    Add section to course
 * @route   POST /api/v1/courses/:courseId/sections
 * @access  Private (Creator only - own course)
 */
const addSection = asyncHandler(async (req, res, next) => {
  const course = await Course.findOne({
    $or: [{ _id: req.params.courseId }, { courseId: req.params.courseId }],
  });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  // Check ownership
  if (course.creator.toString() !== req.user._id.toString()) {
    return next(
      errors.forbidden("You can only add sections to your own courses")
    );
  }

  const { title, description, order } = req.body;

  if (!title) {
    return next(
      new AppError("Section title is required", 400, "VALIDATION_ERROR")
    );
  }

  // Get the next order if not provided
  let sectionOrder = order;
  if (sectionOrder === undefined) {
    const lastSection = await Section.findOne({ course: course._id }).sort(
      "-order"
    );
    sectionOrder = lastSection ? lastSection.order + 1 : 1;
  }

  const section = await Section.create({
    title,
    description: description || "",
    order: sectionOrder,
    course: course._id,
  });

  // Add section to course
  course.sections.push(section._id);
  await course.save();

  res.status(201).json({
    success: true,
    data: {
      id: section._id,
      title: section.title,
      description: section.description,
      order: section.order,
      courseId: course._id,
      videos: [],
    },
  });
});

/**
 * @desc    Update section
 * @route   PUT /api/v1/courses/:courseId/sections/:sectionId
 * @access  Private (Creator only - own course)
 */
const updateSection = asyncHandler(async (req, res, next) => {
  const course = await Course.findOne({
    $or: [{ _id: req.params.courseId }, { courseId: req.params.courseId }],
  });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  // Check ownership
  if (course.creator.toString() !== req.user._id.toString()) {
    return next(
      errors.forbidden("You can only update sections in your own courses")
    );
  }

  let section = await Section.findOne({
    _id: req.params.sectionId,
    course: course._id,
  });

  if (!section) {
    return next(errors.notFound("Section"));
  }

  const { title, description, order } = req.body;

  const updateFields = {};
  if (title) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;
  if (order !== undefined) updateFields.order = order;

  section = await Section.findByIdAndUpdate(section._id, updateFields, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    data: {
      id: section._id,
      title: section.title,
      description: section.description,
      order: section.order,
    },
  });
});

/**
 * @desc    Delete section
 * @route   DELETE /api/v1/courses/:courseId/sections/:sectionId
 * @access  Private (Creator only - own course)
 */
const deleteSection = asyncHandler(async (req, res, next) => {
  const course = await Course.findOne({
    $or: [{ _id: req.params.courseId }, { courseId: req.params.courseId }],
  });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  // Check ownership
  if (course.creator.toString() !== req.user._id.toString()) {
    return next(
      errors.forbidden("You can only delete sections from your own courses")
    );
  }

  const section = await Section.findOne({
    _id: req.params.sectionId,
    course: course._id,
  });

  if (!section) {
    return next(errors.notFound("Section"));
  }

  // Delete all videos in section
  await Video.deleteMany({ section: section._id });

  // Remove section from course
  course.sections = course.sections.filter(
    (s) => s.toString() !== section._id.toString()
  );
  await course.save();

  // Delete section
  await section.deleteOne();

  res.json({
    success: true,
    message: "Section deleted successfully",
  });
});

/**
 * @desc    Reorder sections
 * @route   PUT /api/v1/courses/:courseId/sections/reorder
 * @access  Private (Creator only - own course)
 */
const reorderSections = asyncHandler(async (req, res, next) => {
  const course = await Course.findOne({
    $or: [{ _id: req.params.courseId }, { courseId: req.params.courseId }],
  });

  if (!course) {
    return next(errors.notFound("Course"));
  }

  // Check ownership
  if (course.creator.toString() !== req.user._id.toString()) {
    return next(
      errors.forbidden("You can only reorder sections in your own courses")
    );
  }

  const { sectionOrders } = req.body; // Array of { sectionId, order }

  if (!Array.isArray(sectionOrders)) {
    return next(
      new AppError("sectionOrders must be an array", 400, "VALIDATION_ERROR")
    );
  }

  // Update each section's order
  for (const item of sectionOrders) {
    await Section.findByIdAndUpdate(item.sectionId, { order: item.order });
  }

  res.json({
    success: true,
    message: "Sections reordered successfully",
  });
});

module.exports = {
  addSection,
  updateSection,
  deleteSection,
  reorderSections,
};
