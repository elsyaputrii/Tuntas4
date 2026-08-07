// ============================================================
// FILE: middleware/avatarUploadMiddleware.js
// Multer khusus untuk upload foto profil akun (Staf P4M / Ka P4M /
// Kepala Unit) — dipakai di halaman Profil Saya.
//
// Beda dengan signatureUploadMiddleware.js (tanda tangan):
//   - Nama file diberi prefix "avatar-" biar gampang dibedakan di
//     folder uploads/.
//   - Limit ukuran 2MB, hanya gambar (PNG/JPG/WEBP).
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
    const namaUnik = `avatar-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, namaUnik);
  },
});

const fileFilter = (req, file, cb) => {
  const tipeYangDiizinkan = ["image/jpeg", "image/png", "image/webp"];
  if (tipeYangDiizinkan.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format foto tidak didukung. Hanya PNG, JPG, atau WEBP yang diizinkan."), false);
  }
};

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // maksimal 2MB
  },
});

module.exports = uploadAvatar;