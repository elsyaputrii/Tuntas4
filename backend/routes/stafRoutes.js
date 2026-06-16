// FILE: backend/routes/stafRoutes.js
const express = require("express");
const router  = express.Router();
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
const {
   getLaporanMasuk,
  getKepalaUnit,
  distribusiLaporan,
  getProsesMonitor,
  inputHasilPemantauan,
  setKeputusanBoxing,
  setApprovalStaf,    // ← TAMBAHKAN INI
  getRekapitulasi,
} = require("../controllers/stafController");

// Semua route di bawah ini wajib:
//   1. Punya token valid (authMiddleware)
//   2. Role harus staf_p4m (roleMiddleware)
router.use(authMiddleware);

// ── Tab Laporan Masuk (khusus Staf P4M) ──────────────────
router.get("/laporan",     roleMiddleware("staf_p4m"), getLaporanMasuk);
router.get("/kepala-unit", roleMiddleware("staf_p4m"), getKepalaUnit);
router.post("/boxing",     roleMiddleware("staf_p4m"), distribusiLaporan);
router.get("/rekap",       roleMiddleware("staf_p4m"), getRekapitulasi);

// ── Tab Proses & Pantau (khusus Staf P4M — pantau & input pemantauan) ─
// Review rancangan & penutupan laporan (selesai) hanya lewat /api/ka-p4m
router.get("/proses",      roleMiddleware("staf_p4m"), getProsesMonitor);
router.post("/pemantauan", roleMiddleware("staf_p4m"), inputHasilPemantauan);
router.patch("/keputusan-boxing", roleMiddleware("staf_p4m"), setKeputusanBoxing);
router.patch("/approval-boxing",  roleMiddleware("staf_p4m"), setApprovalStaf);

module.exports = router;