const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Import konfigurasi database
const { testConnection } = require("./config/db");

// Import semua router
const civitasRoutes = require("./routes/civitasRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ============================================================
// ROUTES
// ============================================================


// ✅ CIVITAS (tanpa login)
app.use("/api/civitas", civitasRoutes);

// ============================================================
// HEALTH CHECK
// ============================================================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TUNTAS4 Backend API berjalan 🚀",
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File terlalu besar (max 5MB)",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// ============================================================
// START SERVER
// ============================================================
async function startServer() {
  await testConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Server jalan di http://localhost:${PORT}`);
  });
}

startServer();