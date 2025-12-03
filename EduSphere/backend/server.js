require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

// Route imports
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const courseRoutes = require("./routes/courses");
const sectionRoutes = require("./routes/sections");
const videoRoutes = require("./routes/videos");
const videoStreamRoutes = require("./routes/videoStream");
const purchaseRoutes = require("./routes/purchases");
const progressRoutes = require("./routes/progress");
const creatorRoutes = require("./routes/creator");
const uploadRoutes = require("./routes/upload");
const categoryRoutes = require("./routes/categories");

// Connect to database
connectDB();

const app = express();

// CORS configuration
app.use(cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
    },
  },
});

const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many upload requests, please try again later",
    },
  },
});

// Serve video files statically (with auth check in video routes)
app.use("/data", express.static(path.join(__dirname, "data")));

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/courses", sectionRoutes);
app.use("/api/v1/courses", videoRoutes);
app.use("/api/v1/videos", videoStreamRoutes);
app.use("/api/v1/purchases", purchaseRoutes);
app.use("/api/v1/progress", progressRoutes);
app.use("/api/v1/creator", creatorRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/categories", categoryRoutes);

// Health check
app.get("/api/v1/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.originalUrl} not found`,
    },
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

module.exports = app;
