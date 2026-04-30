// FILE: backend/server.js

const express = require("express");
const cors    = require("cors");
const path    = require("path");
require("dotenv").config();

const { testConnection } = require("./config/db");

// Import semua router
const civitasRoutes = require("./routes/civitasRoutes");
const authRoutes    = require("./routes/authRoutes");
const stafRoutes    = require("./routes/stafRoutes");

const app  = express();
const PORT = process.env.PORT || 5000;

// CORS
app.use(cors({
  origin:         process.env.FRONTEND_URL || "http://localhost:3000",
  methods:        ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── ROUTES ───────────────────────────────────────────────
app.use("/api/civitas", civitasRoutes); // tanpa login (anonim)
app.use("/api/auth",    authRoutes);    // login per role
app.use("/api/staf",    stafRoutes);    // khusus staf_p4m, wajib login

// Health check
app.get("/", (req, res) => {
  res.json({ success: true, message: "TUNTAS4 Backend API berjalan 🚀" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "File terlalu besar (max 5MB)" });
  }
  return res.status(500).json({ success: false, message: "Internal server error" });
});

// Start server
async function startServer() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 Server jalan di http://localhost:${PORT}`);
  });
}
startServer();