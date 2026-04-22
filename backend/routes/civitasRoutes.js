const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const {
  kirimLaporan,
  cekStatusLaporan,
  getRiwayatLaporan,
} = require("../controllers/civitasController");


router.post("/laporan", upload.single("lampiran"), kirimLaporan);

// GET /api/civitas/laporan/cek?kode=LAP-00042
// Cek status laporan berdasarkan kode unik
router.get("/laporan/cek", cekStatusLaporan);

// GET /api/civitas/laporan?nama=Budi
// Lihat daftar laporan (filter opsional by nama)
router.get("/laporan", getRiwayatLaporan);

module.exports = router;