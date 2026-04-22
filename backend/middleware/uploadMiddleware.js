// ============================================================
// FILE: middleware/uploadMiddleware.js
// Mengatur proses upload file dari civitas ke server
// Menggunakan library multer
// ============================================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();


const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`📁 Folder '${UPLOAD_DIR}' berhasil dibuat`);
}

// ============================================================
// STORAGE ENGINE
// Menentukan DI MANA dan DENGAN NAMA APA file disimpan
// ============================================================
const storage = multer.diskStorage({

  // Tentukan folder tujuan penyimpanan file
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR); // simpan ke folder "uploads/"
  },

  // Tentukan nama file yang disimpan
  filename: (req, file, cb) => {
    // Buat nama unik agar file tidak saling menimpa
    // Format: timestamp-namafile.ekstensi
    // Contoh: 1714000000000-laporan.pdf
    const namaUnik = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, namaUnik);
  },
});

// ============================================================
// FILE FILTER
// Hanya izinkan file PDF, PNG, JPG/JPEG
// File selain itu akan ditolak dengan pesan error
// ============================================================
const fileFilter = (req, file, cb) => {
  const tipeYangDiizinkan = ["image/jpeg", "image/png", "application/pdf"];

  if (tipeYangDiizinkan.includes(file.mimetype)) {
    cb(null, true); // izinkan file
  } else {
    // Tolak file — pesan error ini akan ditangkap oleh error handler di server.js
    cb(new Error("Format file tidak didukung. Hanya PDF, PNG, JPG yang diizinkan."), false);
  }
};

// ============================================================
// BUAT INSTANCE MULTER
// Gabungkan storage + fileFilter + batasan ukuran file
// ============================================================
const upload = multer({
  storage,               // pakai storage engine di atas
  fileFilter,            // pakai filter di atas
  limits: {
    fileSize: 5 * 1024 * 1024, // maksimal 5MB (5 × 1024 × 1024 bytes)
  },
});

// Export agar bisa dipakai di routes
module.exports = upload;