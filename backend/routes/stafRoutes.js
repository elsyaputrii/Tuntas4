// FILE: backend/routes/stafRoutes.js
const express = require("express");
const router  = express.Router();
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
const uploadExcel = require("../middleware/excelUploadMiddleware");
const {
   getLaporanMasuk,
  getKepalaUnit,
  distribusiLaporan,
  getProsesMonitor,
  inputHasilPemantauan,
  setKeputusanBoxing,
  getRekapitulasi,
  uploadArsipRekap,
  getArsipRekap,
} = require("../controllers/stafController");
// ✅ FITUR PINDAH KEWENANGAN: setApprovalStaf ("diterima"/"ditolak" atas
// hasil tindak lanjut Kepala Unit — keputusan "ulang atau tidak") TIDAK
// LAGI di-mount di sini. Staf P4M sekarang hanya boleh lihat & pantau
// (GET /proses), keputusannya sekarang jadi wewenang Ka P4M lewat
// PATCH /api/ka-p4m/approval-hasil (lihat kaP4MRoutes.js).

// Semua route di bawah ini wajib:
//   1. Punya token valid (authMiddleware)
//   2. Role harus staf_p4m (roleMiddleware)
router.use(authMiddleware);

// ── Tab Laporan Masuk (khusus Staf P4M) ──────────────────
router.get("/laporan",     roleMiddleware("staf_p4m"), getLaporanMasuk);
router.get("/kepala-unit", roleMiddleware("staf_p4m"), getKepalaUnit);
router.post("/boxing",     roleMiddleware("staf_p4m"), distribusiLaporan);
router.get("/rekap",       roleMiddleware("staf_p4m"), getRekapitulasi);

// ── Arsip data tahun lalu (upload Excel s/d 10 tahun ke belakang) ─
router.post("/rekap/arsip/upload", roleMiddleware("staf_p4m"), uploadExcel.single("file"), uploadArsipRekap);
router.get("/rekap/arsip",         roleMiddleware("staf_p4m"), getArsipRekap);

// ── Tab Proses & Pantau (khusus Staf P4M — pantau & input pemantauan) ─
// Review rancangan & keputusan hasil tindak lanjut (diterima/ditolak)
// hanya lewat /api/ka-p4m. Staf P4M cuma pantau, tidak memutuskan.
router.get("/proses",      roleMiddleware("staf_p4m"), getProsesMonitor);
router.post("/pemantauan", roleMiddleware("staf_p4m"), inputHasilPemantauan);
router.patch("/keputusan-boxing", roleMiddleware("staf_p4m"), setKeputusanBoxing);

module.exports = router;