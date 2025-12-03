const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethodId: {
      type: String,
      default: "fake_payment", // For demo purposes
    },
    status: {
      type: String,
      enum: ["pending", "completed", "refunded"],
      default: "completed",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    ratedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate purchases
purchaseSchema.index({ user: 1, course: 1 }, { unique: true });

// Virtual for purchasedAt (alias for createdAt)
purchaseSchema.virtual("purchasedAt").get(function () {
  return this.createdAt;
});

purchaseSchema.set("toJSON", { virtuals: true });
purchaseSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Purchase", purchaseSchema);
