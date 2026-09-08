const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
const { laporanLimiter } = require("../middleware/rateLimitMiddleware");
const {
  kirimLaporan,
  cekStatusLaporan,
  getRiwayatLaporan,
} = require("../controllers/civitasController");

// ── Kirim laporan — PUBLIK, tanpa login (civitas anonim) ──────────────
// ✅ Dibatasi rate limit per IP (lihat middleware/rateLimitMiddleware.js)
// supaya endpoint publik ini tidak dipakai untuk spam/flood laporan palsu.
router.post("/laporan", laporanLimiter, upload.single("lampiran"), kirimLaporan);

// ── Cek status — PUBLIK, tanpa login (civitas cek pakai kode tiket) ───
// GET /api/civitas/laporan/cek?kode=LAP-8F2A93C1
// ✅ Kode tiket sekarang acak (bukan sequential) — lihat civitasController.js
router.get("/laporan/cek", cekStatusLaporan);

// ── Riwayat semua laporan — KHUSUS Staf P4M ────────────────────────────
// ✅ FIX SECURITY: sebelumnya endpoint ini TIDAK dilindungi authMiddleware
// sama sekali, padahal isinya semua laporan (termasuk yang anonim/sensitif).
// Siapapun tanpa login bisa GET /api/civitas/laporan dan baca semuanya.
// Sekarang wajib login + role staf_p4m.
// GET /api/civitas/laporan?status=menunggu
router.get("/laporan", authMiddleware, roleMiddleware("staf_p4m"), getRiwayatLaporan);

module.exports = router;