// FILE: backend/server.js
const express = require("express");
const cors    = require("cors");
const path    = require("path");
require("dotenv").config();

const { testConnection } = require("./config/db");

// Import semua router
const civitasRoutes        = require("./routes/civitasRoutes");
const authRoutes           = require("./routes/authRoutes");
const stafRoutes           = require("./routes/stafRoutes");
const forgotPasswordRoutes = require("./routes/forgotPasswordRoutes");
const kepalaUnitRoutes     = require("./routes/kepalaUnitRoutes");
const kaP4MRoutes          = require("./routes/kaP4MRoutes");
const userRoutes           = require("./routes/userRoutes");
const notifikasiRoutes     = require("./routes/notifikasiRoutes");

const app  = express();
const PORT = process.env.PORT || 5000;

// ✅ WAJIB kalau backend ini di belakang reverse proxy (Nginx) di produksi
app.set("trust proxy", 1);

// ==============================================
// 🔧 FIX CORS - Support multiple origins
// ==============================================
const allowedOrigins = [
  'http://localhost:3000',
  'https://tuntas.polibatam.ac.id'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// ==============================================
// ATAU kalo mau pake .env (lebih flexible):
// ==============================================
/*
const allowedOrigins = (process.env.FRONTEND_URLS || 'http://localhost:3000').split(',');

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
*/

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/civitas",     civitasRoutes);
app.use("/api/auth",        authRoutes);
app.use("/api/auth",        forgotPasswordRoutes);
app.use("/api/staf",        stafRoutes);
app.use("/api/kepala-unit", kepalaUnitRoutes);
app.use("/api/ka-p4m",      kaP4MRoutes);
app.use("/api/users",       userRoutes);
app.use("/api/notifikasi",  notifikasiRoutes);

app.get("/", (req, res) => {
  res.json({ success: true, message: "TUNTAS4 Backend API berjalan 🚀" });
});

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "Ukuran file terlalu besar." });
  }
  return res.status(500).json({ success: false, message: "Internal server error" });
});

async function startServer() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 Server jalan di http://localhost:${PORT}`);
  });
}
startServer();