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
  getLaporanDitolakStaf,
  submitRevisiRancangan,
} = require("../controllers/kepalaUnitController");

// Semua route di bawah wajib: token valid + role = kepala_unit
router.use(authMiddleware);
router.use(roleMiddleware("kepala_unit"));

// ── TAB KETIDAKSESUAIAN MASUK ──
router.get("/laporan",    getLaporanMasuk);        
router.post("/rancangan", submitRancangan);        

// ── TAB LAPORAN HASIL ──
router.get("/laporan-hasil", getLaporanHasil);                          
router.post("/pelaksanaan",  upload.single("lampiran"), submitPelaksanaan); 

// ── TAB KEPUTUSAN STAF ──
router.get("/laporan-ditolak-staf", getLaporanDitolakStaf);   
router.post("/revisi-rancangan", submitRevisiRancangan);      

module.exports = router;