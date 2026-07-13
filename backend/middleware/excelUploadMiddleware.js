// ============================================================
// FILE: middleware/excelUploadMiddleware.js
// Mengatur upload file Excel (.xlsx/.xls) untuk fitur
// "Upload Data Lama" di halaman Rekapitulasi.
//
// Beda dengan uploadMiddleware.js (uploads/ dokumen laporan),
// file di sini TIDAK disimpan ke disk — cukup dibaca di memori
// lalu datanya dimasukkan ke tabel arsip_rekapitulasi, jadi
// dipakai multer.memoryStorage().
// ============================================================

const multer = require("multer");

const storage = multer.memoryStorage();

const MIME_EXCEL = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "application/octet-stream", // beberapa browser kirim ini utk .xlsx
];

const fileFilter = (req, file, cb) => {
  const namaCocok = /\.(xlsx|xls)$/i.test(file.originalname);
  if (MIME_EXCEL.includes(file.mimetype) && namaCocok) {
    cb(null, true);
  } else if (namaCocok) {
    // mimetype kadang tidak konsisten antar-browser, tapi ekstensi valid → izinkan
    cb(null, true);
  } else {
    cb(new Error("Format file tidak didukung. Hanya file Excel (.xlsx / .xls) yang diizinkan."), false);
  }
};

const uploadExcel = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // maksimal 10MB
  },
});

module.exports = uploadExcel;