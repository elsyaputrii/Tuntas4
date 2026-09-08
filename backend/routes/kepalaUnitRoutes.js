// FILE: backend/routes/kepalaUnitRoutes.js

const express = require("express");
const router  = express.Router();
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getLaporanMasuk,
  submitRancangan,
  getLaporanHasil,
  getRiwayat,
  submitPelaksanaan,
} = require("../controllers/kepalaUnitController");

// Semua route di bawah wajib: token valid + role = kepala_unit ATAU ka_p4m
// (ka_p4m yang login otomatis dianggap Kepala Unit P4M, lihat getKepalaInfo
// di kepalaUnitController.js)
router.use(authMiddleware);
router.use(roleMiddleware("kepala_unit", "ka_p4m"));

// Tab Ketidaksesuaian Masuk
router.get("/laporan",    getLaporanMasuk);   // GET  /api/kepala-unit/laporan
router.post("/rancangan", submitRancangan);   // POST /api/kepala-unit/rancangan

// Tab Laporan Hasil
router.get("/laporan-hasil", getLaporanHasil);                          // GET  /api/kepala-unit/laporan-hasil
router.post("/pelaksanaan",  upload.single("lampiran"), submitPelaksanaan); // POST /api/kepala-unit/pelaksanaan

// Tab Riwayat — rekap SEMUA laporan yang pernah didistribusikan/ditangani
// Kepala Unit ini (apa pun tahapnya sekarang: masih di Kepala Unit,
// menunggu keputusan Ka P4M, di Staf P4M, atau sudah selesai), plus
// export PDF per laporan. Lihat getRiwayat di kepalaUnitController.js.
router.get("/riwayat", getRiwayat);                                     // GET  /api/kepala-unit/riwayat

module.exports = router;