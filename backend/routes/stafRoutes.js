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
  deleteArsipRekap,
  setApprovalStaf,
} = require("../controllers/stafController");
// ✅ FITUR DIKEMBALIKAN: setApprovalStaf ("Siap"/"Belum Siap" atas hasil
// tindak lanjut Kepala Unit) sempat dipindah ke Ka P4M (PATCH
// /api/ka-p4m/approval-hasil), tapi sekarang dikembalikan lagi ke Staf
// P4M sebagai satu-satunya pemegang keputusan ini. Lihat juga
// kaP4MRoutes.js (route approval-hasil di sana sudah dicabut) dan
// KaP4MHasilTable.tsx / ProcessMonitorTable.tsx di frontend.

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
router.delete("/rekap/arsip",      roleMiddleware("staf_p4m"), deleteArsipRekap);

// ── Tab Proses & Pantau (khusus Staf P4M — pantau + Keputusan Staff) ─
// Review rancangan (ditindaklanjuti/tidak) tetap wewenang Ka P4M lewat
// /api/ka-p4m/keputusan. Tapi keputusan akhir atas HASIL tindak lanjut
// unit (✅ Selesai / ❌ Di tindaklanjutin) sekarang wewenang Staf P4M lagi.
router.get("/proses",      roleMiddleware("staf_p4m"), getProsesMonitor);
router.post("/pemantauan", roleMiddleware("staf_p4m"), inputHasilPemantauan);
router.patch("/keputusan-boxing", roleMiddleware("staf_p4m"), setKeputusanBoxing);
router.patch("/approval-hasil",   roleMiddleware("staf_p4m"), setApprovalStaf);

module.exports = router;