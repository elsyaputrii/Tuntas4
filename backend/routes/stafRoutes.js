// FILE: backend/routes/stafRoutes.js
const express = require("express");
const router  = express.Router();
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
const {
  getLaporanMasuk,
  getKepalaUnit,
  distribusiLaporan,
  getProsesMonitor,
  reviewRancangan,        // ← pastikan ini diimport
  inputHasilPemantauan,
  setStatusLaporan,
  getRekapitulasi,
} = require("../controllers/stafController");

// Semua route di bawah ini wajib:
//   1. Punya token valid (authMiddleware)
//   2. Role harus staf_p4m (roleMiddleware)
router.use(authMiddleware);
router.use(roleMiddleware("staf_p4m", "ka_p4m")); 
// ka_p4m juga boleh akses GET /proses untuk halaman KaP4MReviewTable
// karena KaP4MReviewTable.tsx memanggil stafApi.getProsesMonitor()

// ── Tab Laporan Masuk ────────────────────────────────────
router.get("/laporan",     getLaporanMasuk);    // GET  /api/staf/laporan
router.get("/kepala-unit", getKepalaUnit);      // GET  /api/staf/kepala-unit
router.post("/boxing",     distribusiLaporan);  // POST /api/staf/boxing

// ── Tab Proses & Pantau ──────────────────────────────────
router.get("/proses",            getProsesMonitor);      // GET   /api/staf/proses
router.patch("/review-rancangan", reviewRancangan);      // PATCH /api/staf/review-rancangan ← BARU
router.post("/pemantauan",       inputHasilPemantauan);  // POST  /api/staf/pemantauan
router.patch("/status",          setStatusLaporan);      // PATCH /api/staf/status

// ── Tab Rekapitulasi ─────────────────────────────────────
router.get("/rekap", getRekapitulasi);                   // GET   /api/staf/rekap

module.exports = router;