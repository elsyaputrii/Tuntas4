// FILE: backend/routes/kepalaUnitRoutes.js

const express = require("express");
const router  = express.Router();
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getLaporanMasuk,
  submitRancangan,
  getLaporanHasil,
  submitPelaksanaan,
} = require("../controllers/kepalaUnitController");

// Semua route di bawah wajib: token valid + role = kepala_unit
router.use(authMiddleware);
router.use(roleMiddleware("kepala_unit"));

// Tab Ketidaksesuaian Masuk
router.get("/laporan",    getLaporanMasuk);   // GET  /api/kepala-unit/laporan
router.post("/rancangan", submitRancangan);   // POST /api/kepala-unit/rancangan

// Tab Laporan Hasil
router.get("/laporan-hasil", getLaporanHasil);                          // GET  /api/kepala-unit/laporan-hasil
router.post("/pelaksanaan",  upload.single("lampiran"), submitPelaksanaan); // POST /api/kepala-unit/pelaksanaan

module.exports = router;