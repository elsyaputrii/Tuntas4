// FILE: backend/routes/kaP4MRoutes.js
// ============================================================
// Route khusus Ka P4M
const router  = express.Router();
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
const { pool } = require("../config/db");

// Semua route di bawah wajib: token valid + role = ka_p4m
router.use(authMiddleware);
router.use(roleMiddleware("ka_p4m"));

// ============================================================
// GET /api/ka-p4m/proses
// Ambil semua data proses untuk keperluan review Ka P4M
// Sama seperti getProsesMonitor milik staf, tapi diakses Ka P4M
// ============================================================
router.get("/proses", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        l.id_laporan,
        l.jenis_laporan,
        l.deskripsi           AS isi_laporan,
        l.lampiran            AS lampiran_laporan,
        l.status              AS status_laporan,
        l.created_at,

        b.id_boxing,
        b.unit_tujuan         AS nama_unit,
        b.status              AS status_boxing,

        r.id_rancangan,
        r.penyebab,
        r.deskripsi           AS rencana_tindakan,
        r.status_review,
        r.catatan             AS catatan_kepala,

        p.deskripsi           AS hasil_tindakan,
        p.lampiran            AS lampiran_hasil,
        p.tanggal             AS tanggal_pelaksanaan
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l    ON l.id_laporan = b.id_laporan
      LEFT JOIN rancangan_tindakan r    ON r.id_boxing  = b.id_boxing
      LEFT JOIN pelaksanaan_tindakan p  ON p.id_boxing  = b.id_boxing
      ORDER BY l.created_at DESC`
    );

    const data = rows.map((row) => ({
      ...row,
      kode_laporan: `LAP-${String(row.id_laporan).padStart(5, "0")}`,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error kaP4M getProsesMonitor:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data proses." });
  }
});

// ============================================================
// PATCH /api/ka-p4m/review-rancangan
// Ka P4M review rancangan dari Kepala Unit
// Body: { id_rancangan, status_review, catatan }
// ============================================================
router.patch("/review-rancangan", async (req, res) => {
  const { id_rancangan, status_review, catatan } = req.body;

  if (!id_rancangan || !status_review) {
    return res.status(400).json({
      success: false,
      message: "id_rancangan dan status_review wajib diisi.",
    });
  }

  const statusValid = ["disetujui", "tidak_disetujui", "revisi"];
  if (!statusValid.includes(status_review)) {
    return res.status(400).json({
      success: false,
      message: `status_review tidak valid. Pilih: ${statusValid.join(", ")}`,
    });
  }

  if (status_review !== "disetujui" && (!catatan || !catatan.trim())) {
    return res.status(400).json({
      success: false,
      message: "Catatan wajib diisi jika status revisi atau tidak disetujui.",
    });
  }

  try {
    const [existing] = await pool.query(
      `SELECT id_rancangan, status_review FROM rancangan_tindakan WHERE id_rancangan = ?`,
      [id_rancangan]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Rancangan tidak ditemukan." });
    }

    await pool.query(
      `UPDATE rancangan_tindakan
       SET status_review = ?, catatan = ?, updated_at = NOW()
       WHERE id_rancangan = ?`,
      [status_review, catatan || null, id_rancangan]
    );

    const pesanMap = {
      disetujui:       "✅ Rancangan disetujui oleh Ka P4M.",
      revisi:          "📝 Rancangan dikembalikan untuk direvisi.",
      tidak_disetujui: "❌ Rancangan tidak disetujui.",
    };

    return res.status(200).json({ success: true, message: pesanMap[status_review] });
  } catch (error) {
    console.error("Error kaP4M reviewRancangan:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan review." });
  }
});

// ============================================================
// PATCH /api/ka-p4m/status
// Ka P4M ubah status laporan (CLOSE = selesai / OPEN = diproses)
// Body: { id_laporan, status }
// ============================================================
router.patch("/status", async (req, res) => {
  const { id_laporan, status } = req.body;

  const statusValid = ["selesai", "diproses", "ditolak"];
  if (!id_laporan || !statusValid.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status tidak valid. Pilih: ${statusValid.join(", ")}`,
    });
  }

  try {
    const [result] = await pool.query(
      `UPDATE laporan_ketidaksesuaian SET status = ? WHERE id_laporan = ?`,
      [status, id_laporan]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Laporan tidak ditemukan." });
    }

    return res.status(200).json({
      success: true,
      message: `Status laporan berhasil diubah menjadi '${status}'.`,
    });
  } catch (error) {
    console.error("Error kaP4M setStatus:", error);
    return res.status(500).json({ success: false, message: "Gagal mengubah status laporan." });
  }
});

module.exports = router;