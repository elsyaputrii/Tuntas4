// FILE: backend/routes/kaP4MRoutes.js
const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
const { pool } = require("../config/db");
const { notifikasiUntukPengguna } = require("../utils/notifikasi");

router.use(authMiddleware);
router.use(roleMiddleware("ka_p4m"));

router.get("/proses", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        l.id_laporan,
        l.kode_laporan,
        l.jenis_laporan,
        l.deskripsi AS isi_laporan,
        l.lampiran AS lampiran_laporan,
        l.status AS status_laporan,
        l.created_at,
        b.id_boxing,
        b.unit_tujuan AS nama_unit,
        b.status AS status_boxing,
        b.approval_staf,
        b.catatan_approval,
        b.updated_at AS tanggal_keputusan_ka,
        r.id_rancangan,
        r.penyebab,
        r.deskripsi AS rencana_tindakan,
        r.tanggal_rencana,
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

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error kaP4M getProses:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data." });
  }
});

// Ka P4M: ditindaklanjuti (+ aksi masukan) atau tidak ditindaklanjuti
//
// ✅ REVISI (permintaan user/dosen):
//   Dua-duanya — baik "ditindaklanjuti" maupun "tidak" (Sesuai) — sekarang
//   WAJIB lewat tab "Laporan Hasil" Kepala Unit dulu (status_boxing =
//   'menunggu_pelaksanaan'), supaya Kepala Unit tetap mengisi bukti
//   pelaksanaan. Yang membedakan cuma `status_review` (untuk badge "Tindak
//   Lanjut" vs "Sesuai"), tapi alurnya sama: Kepala Unit isi bukti → Staf
//   P4M putuskan ✅ Siap / ❌ Belum Siap.
//
//   Kalau Staf P4M tolak, revisi balik ke "Laporan Hasil" (bukan ke
//   "Ketidaksesuaian Masuk"), karena Penyebab & Rencana sudah disetujui
//   Ka P4M — yang perlu direvisi hanya bukti pelaksanaannya.
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
      `SELECT r.id_rancangan, r.id_boxing, r.status_review, b.id_laporan,
              b.unit_tujuan, k.id_pengguna AS id_pengguna_kepala
       FROM rancangan_tindakan r
       JOIN boxing_ketidaksesuaian b ON b.id_boxing = r.id_boxing
       LEFT JOIN kepala_unit k ON k.id_kepala = b.id_kepala
       WHERE r.id_rancangan = ?`,
      [id_rancangan]
    );

    if (rows.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: "Rancangan tidak ditemukan." });
    }

    const row = rows[0];
    const editableStatus = [
      "menunggu_keputusan_ka",
      "ditindaklanjuti",
      "tidak_ditindaklanjuti",
    ];
    if (!editableStatus.includes(row.status_review)) {
      conn.release();
      return res.status(400).json({
        success: false,
        message: "Rancangan ini tidak bisa diputuskan pada tahap ini.",
      });
    }

    await conn.beginTransaction();

    if (keputusan === "ditindaklanjuti") {
      // ── Keputusan: Tindak Lanjut ──
      await conn.query(
        `UPDATE rancangan_tindakan
         SET status_review = 'ditindaklanjuti', aksi_masukan = ?, updated_at = NOW()
         WHERE id_rancangan = ?`,
        [aksi_masukan.trim(), id_rancangan]
      );
      await conn.query(
        `UPDATE boxing_ketidaksesuaian
         SET status = 'menunggu_pelaksanaan',
             approval_staf = 'menunggu',
             catatan_approval = NULL
         WHERE id_boxing = ?`,
        [row.id_boxing]
      );
    } else {
      // ── Keputusan: Sesuai ──
      // ✅ REVISI: sekarang juga masuk 'menunggu_pelaksanaan' (ke Laporan
      //    Hasil Kepala Unit), bukan langsung 'di_staff'.
      await conn.query(
        `UPDATE rancangan_tindakan
         SET status_review = 'tidak_ditindaklanjuti', aksi_masukan = ?, updated_at = NOW()
         WHERE id_rancangan = ?`,
        [aksi_masukan?.trim() || null, id_rancangan]
      );
      await conn.query(
        `UPDATE boxing_ketidaksesuaian
         SET status = 'menunggu_pelaksanaan',
             approval_staf = 'menunggu',
             catatan_approval = NULL
         WHERE id_boxing = ?`,
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
        ? "Laporan ditindaklanjuti. Masukan telah dikirim ke Kepala Unit untuk diisi bukti pelaksanaannya."
        : "Laporan dinyatakan Sesuai. Kepala Unit tetap perlu mengisi bukti pelaksanaan di tab Laporan Hasil.";

    // ✅ REVISI: notifikasi ke Kepala Unit — dua-duanya minta isi Laporan Hasil.
    if (row.id_pengguna_kepala) {
      notifikasiUntukPengguna(row.id_pengguna_kepala, {
        judul:
          keputusan === "ditindaklanjuti"
            ? "Rancangan Disetujui Ka P4M"
            : "Rancangan Disetujui Ka P4M (Sesuai)",
        pesan:
          keputusan === "ditindaklanjuti"
            ? `Rancangan tindakan untuk unit ${row.unit_tujuan} disetujui Ka P4M. Silakan isi bukti pelaksanaan di tab Laporan Hasil.`
            : `Rancangan tindakan untuk unit ${row.unit_tujuan} disetujui Ka P4M (Sesuai). Silakan isi bukti pelaksanaan di tab Laporan Hasil.`,
        jenis: "keputusan_ka",
        link: "/kepala-unit/laporan-hasil",
      });
    }

    return res.status(200).json({ success: true, message: pesan });
  } catch (error) {
    await conn.rollback();
    console.error("Error kaP4M keputusan:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan keputusan." });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────
// FITUR BARU: KA-P4M → Kepala Unit (read-only, semua unit)
// ─────────────────────────────────────────────────────────────

router.get("/kepala-unit/laporan-masuk", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        b.id_boxing, b.unit_tujuan, b.status AS status_boxing, b.approval_staf,
        b.created_at AS tanggal_distribusi,
        l.id_laporan, l.kode_laporan, l.jenis_laporan, l.deskripsi AS isi_laporan,
        l.lampiran AS lampiran_laporan, l.status AS status_laporan,
        l.created_at,
        r.id_rancangan, r.penyebab, r.deskripsi AS rencana_tindakan,
        r.tanggal_rencana,
        r.status_review, r.aksi_masukan, r.catatan AS catatan_review
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l ON l.id_laporan = b.id_laporan
      LEFT JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
      ORDER BY b.created_at DESC`
    );

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error kaP4M getKepalaUnitLaporanMasuk:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data laporan masuk kepala unit." });
  }
});

router.get("/kepala-unit/laporan-hasil", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        b.id_boxing, b.unit_tujuan, b.status AS status_boxing, b.approval_staf,
        l.id_laporan, l.kode_laporan, l.jenis_laporan, l.deskripsi AS isi_laporan,
        r.id_rancangan, r.penyebab, r.deskripsi AS rencana_tindakan,
        r.tanggal_rencana,
        r.status_review, r.aksi_masukan, r.updated_at AS tanggal_ditindaklanjuti,
        COALESCE(l.tanggal_kejadian, l.created_at) AS tanggal_laporan,
        p.id_pelaksanaan, p.deskripsi AS hasil_tindakan,
        p.lampiran AS lampiran_hasil, p.tanggal AS tanggal_pelaksanaan
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l ON l.id_laporan = b.id_laporan
      JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
      LEFT JOIN pelaksanaan_tindakan p ON p.id_boxing = b.id_boxing
      ORDER BY b.created_at DESC`
    );

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error kaP4M getKepalaUnitLaporanHasil:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data laporan hasil kepala unit." });
  }
});

module.exports = router;