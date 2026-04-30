// FILE: backend/routes/stafRoutes.js
// Semua route Staff P4M — WAJIB LOGIN dengan role staf_p4m

const express = require("express");
const router  = express.Router();
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
const {
  getLaporanMasuk,
  getKepalaUnit,
  distribusiLaporan,
  getProsesMonitor,
  inputHasilPemantauan,
  setStatusLaporan,
  getRekapitulasi,
} = require("../controllers/stafController");

// Semua route di bawah ini wajib:
//   1. Punya token valid (authMiddleware)
//   2. Role harus staf_p4m (roleMiddleware)
router.use(authMiddleware);
router.use(roleMiddleware("staf_p4m"));

// ── Tab Laporan Masuk ────────────────────────────────────
router.get("/laporan",     getLaporanMasuk);   // lihat laporan masuk
router.get("/kepala-unit", getKepalaUnit);     // ambil daftar kepala unit
router.post("/boxing",     distribusiLaporan); // distribusikan laporan

// ── Tab Proses & Pantau ──────────────────────────────────
router.get("/proses",       getProsesMonitor);     // lihat semua proses
router.post("/pemantauan",  inputHasilPemantauan); // input hasil pemantauan
router.patch("/status",     setStatusLaporan);     // close / open laporan

// ── Tab Rekapitulasi ─────────────────────────────────────
router.get("/rekap", getRekapitulasi);

module.exports = router;