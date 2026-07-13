// ============================================================
// FILE: middleware/signatureUploadMiddleware.js
// Multer khusus untuk upload gambar tanda tangan (TTD) akun
// (Staf P4M / Ka P4M / Kepala Unit) — dipakai di halaman Data Akun.
//
// Beda dengan uploadMiddleware.js (lampiran laporan):
//   - Hanya menerima gambar (PNG/JPG), bukan PDF.
//   - Ukuran maksimal lebih kecil (2MB) karena hanya gambar TTD.
//   - Nama file diberi prefix "ttd-" biar gampang dibedakan di folder uploads/.
// ============================================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const namaUnik = `ttd-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, namaUnik);
  },
});

const fileFilter = (req, file, cb) => {
  const tipeYangDiizinkan = ["image/jpeg", "image/png", "image/webp"];
  if (tipeYangDiizinkan.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format tanda tangan tidak didukung. Hanya PNG, JPG, atau WEBP yang diizinkan."), false);
  }
};

const uploadSignature = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // maksimal 2MB
  },
});

module.exports = uploadSignature;