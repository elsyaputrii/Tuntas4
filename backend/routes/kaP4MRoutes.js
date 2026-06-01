// FILE: backend/routes/kaP4MRoutes.js
const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
const { pool } = require("../config/db");

router.use(authMiddleware);
router.use(roleMiddleware("ka_p4m"));

router.get("/proses", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        l.id_laporan,
        l.jenis_laporan,
        l.deskripsi AS isi_laporan,
        l.lampiran AS lampiran_laporan,
        l.status AS status_laporan,
        l.created_at,
        b.id_boxing,
        b.unit_tujuan AS nama_unit,
        b.status AS status_boxing,
        r.id_rancangan,
        r.penyebab,
        r.deskripsi AS rencana_tindakan,
        r.status_review,
        r.aksi_masukan,
        r.catatan AS catatan_kepala,
        p.deskripsi AS hasil_tindakan,
        p.lampiran AS lampiran_hasil,
        p.tanggal AS tanggal_pelaksanaan
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l ON l.id_laporan = b.id_laporan
      LEFT JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
      LEFT JOIN pelaksanaan_tindakan p ON p.id_boxing = b.id_boxing
      ORDER BY l.created_at DESC`
    );

    const data = rows.map((row) => ({
      ...row,
      kode_laporan: `LAP-${String(row.id_laporan).padStart(5, "0")}`,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error kaP4M getProses:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data." });
  }
});

// Ka P4M: ditindaklanjuti (+ aksi masukan) atau tidak ditindaklanjuti
router.patch("/keputusan", async (req, res) => {
  const { id_rancangan, keputusan, aksi_masukan } = req.body;

  if (!id_rancangan || !keputusan) {
    return res.status(400).json({
      success: false,
      message: "id_rancangan dan keputusan wajib diisi.",
    });
  }

  const valid = ["ditindaklanjuti", "tidak"];
  if (!valid.includes(keputusan)) {
    return res.status(400).json({
      success: false,
      message: "Keputusan harus: ditindaklanjuti atau tidak.",
    });
  }

  if (keputusan === "ditindaklanjuti" && !aksi_masukan?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Aksi masukan wajib diisi jika laporan ditindaklanjuti.",
    });
  }

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT r.id_rancangan, r.id_boxing, r.status_review, b.id_laporan
       FROM rancangan_tindakan r
       JOIN boxing_ketidaksesuaian b ON b.id_boxing = r.id_boxing
       WHERE r.id_rancangan = ?`,
      [id_rancangan]
    );

    if (rows.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: "Rancangan tidak ditemukan." });
    }

    const row = rows[0];
    if (row.status_review !== "menunggu_keputusan_ka") {
      conn.release();
      return res.status(400).json({
        success: false,
        message: "Rancangan ini sudah diputuskan sebelumnya.",
      });
    }

    await conn.beginTransaction();

    if (keputusan === "ditindaklanjuti") {
      await conn.query(
        `UPDATE rancangan_tindakan
         SET status_review = 'ditindaklanjuti', aksi_masukan = ?, updated_at = NOW()
         WHERE id_rancangan = ?`,
        [aksi_masukan.trim(), id_rancangan]
      );
      await conn.query(
        `UPDATE boxing_ketidaksesuaian SET status = 'menunggu_pelaksanaan' WHERE id_boxing = ?`,
        [row.id_boxing]
      );
    } else {
      await conn.query(
        `UPDATE rancangan_tindakan
         SET status_review = 'tidak_ditindaklanjuti', aksi_masukan = NULL, updated_at = NOW()
         WHERE id_rancangan = ?`,
        [id_rancangan]
      );
      await conn.query(
        `UPDATE boxing_ketidaksesuaian SET status = 'di_staff' WHERE id_boxing = ?`,
        [row.id_boxing]
      );
    }

    await conn.query(
      `UPDATE laporan_ketidaksesuaian SET status = 'diproses' WHERE id_laporan = ?`,
      [row.id_laporan]
    );

    await conn.commit();

    const pesan =
      keputusan === "ditindaklanjuti"
        ? "Laporan ditindaklanjuti. Masukan telah dikirim ke Kepala Unit."
        : "Laporan tidak ditindaklanjuti. Langsung ke Staf P4M.";

    return res.status(200).json({ success: true, message: pesan });
  } catch (error) {
    await conn.rollback();
    console.error("Error kaP4M keputusan:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan keputusan." });
  } finally {
    conn.release();
  }
});

module.exports = router;
