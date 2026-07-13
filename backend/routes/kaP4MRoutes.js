// FILE: backend/routes/kaP4MRoutes.js
const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
const { pool } = require("../config/db");
// ✅ FITUR PINDAH KEWENANGAN: keputusan "diterima/ditolak" atas hasil
// tindak lanjut Kepala Unit sekarang jadi wewenang Ka P4M, BUKAN Staf
// P4M lagi. Staf P4M cuma boleh lihat & pantau (lewat /staf/proses),
// tidak boleh memutuskan ulang-atau-tidak. Fungsi setApprovalStaf tetap
// hidup di stafController.js (logic-nya tidak berubah), tapi sekarang
// di-mount di endpoint /ka-p4m/approval-hasil, jadi otomatis kena
// roleMiddleware("ka_p4m") dari router.use di bawah — bukan lagi
// roleMiddleware("staf_p4m") seperti sebelumnya di stafRoutes.js.
const { setApprovalStaf } = require("../controllers/stafController");

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
        b.approval_staf,
        b.catatan_approval,
        b.updated_at AS tanggal_keputusan_ka,
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
    // ✅ FIX: sebelumnya endpoint ini menolak (400) kalau status_review
    // sudah bukan "menunggu_keputusan_ka" lagi. Itu bikin fitur "Edit
    // Keputusan" (tombol pensil kuning di tabel) tidak pernah bisa
    // dipakai, karena tombol itu justru muncul untuk rancangan yang
    // SUDAH diputuskan (ditindaklanjuti / tidak_ditindaklanjuti).
    // Sekarang endpoint ini boleh dipanggil ulang untuk kedua status
    // tersebut (mode edit), dan hanya menolak kalau rancangan belum
    // pernah diputuskan sama sekali dalam kondisi yang tidak valid.
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

// ─────────────────────────────────────────────────────────────
// FITUR BARU: KA-P4M → Kepala Unit (read-only, semua unit)
// Tujuan: Ka P4M bisa memantau semua data yang berkaitan dengan
// Kepala Unit (bukan cuma unit tertentu), tanpa bisa mengubah apa-apa.
// ─────────────────────────────────────────────────────────────

// Mirror dari getLaporanMasuk milik Kepala Unit, tapi TANPA filter
// per id_kepala (jadi menampilkan laporan dari SEMUA unit).
router.get("/kepala-unit/laporan-masuk", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        b.id_boxing, b.unit_tujuan, b.status AS status_boxing, b.approval_staf,
        b.created_at AS tanggal_distribusi,
        l.id_laporan, l.jenis_laporan, l.deskripsi AS isi_laporan,
        l.lampiran AS lampiran_laporan, l.status AS status_laporan,
        l.created_at,
        r.id_rancangan, r.penyebab, r.deskripsi AS rencana_tindakan,
        r.status_review, r.aksi_masukan, r.catatan AS catatan_review
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l ON l.id_laporan = b.id_laporan
      LEFT JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
      ORDER BY b.created_at DESC`
    );

    const data = rows.map((row) => ({
      ...row,
      kode_laporan: `LAP-${String(row.id_laporan).padStart(5, "0")}`,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error kaP4M getKepalaUnitLaporanMasuk:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data laporan masuk kepala unit." });
  }
});

// Mirror dari getLaporanHasil milik Kepala Unit, tapi TANPA filter
// per id_kepala (jadi menampilkan laporan hasil dari SEMUA unit).
router.get("/kepala-unit/laporan-hasil", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        b.id_boxing, b.unit_tujuan, b.status AS status_boxing, b.approval_staf,
        l.id_laporan, l.jenis_laporan, l.deskripsi AS isi_laporan,
        r.id_rancangan, r.penyebab, r.deskripsi AS rencana_tindakan,
        r.status_review, r.aksi_masukan, r.updated_at AS tanggal_ditindaklanjuti,
        l.created_at AS tanggal_laporan,
        p.id_pelaksanaan, p.deskripsi AS hasil_tindakan,
        p.lampiran AS lampiran_hasil, p.tanggal AS tanggal_pelaksanaan
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l ON l.id_laporan = b.id_laporan
      JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
      LEFT JOIN pelaksanaan_tindakan p ON p.id_boxing = b.id_boxing
      ORDER BY b.created_at DESC`
    );

    const data = rows.map((row) => ({
      ...row,
      kode_laporan: `LAP-${String(row.id_laporan).padStart(5, "0")}`,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error kaP4M getKepalaUnitLaporanHasil:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data laporan hasil kepala unit." });
  }
});

// ─────────────────────────────────────────────────────────────
// FITUR PINDAH: Ka P4M memutuskan hasil tindak lanjut Kepala Unit
// (diterima → laporan otomatis Selesai | ditolak → balik ke Kepala
// Unit untuk revisi hasil). Ini KEPUTUSAN "ulang atau tidak" yang
// sebelumnya dipegang Staf P4M (PATCH /staf/approval-boxing) — sekarang
// hanya Ka P4M yang boleh. Staf P4M tetap bisa LIHAT hasilnya lewat
// GET /staf/proses, tapi tombol keputusannya sudah dicabut dari sisi
// Staf (lihat stafRoutes.js & ProcessMonitorTable.tsx / RecapitulationTable.tsx).
// Logic setApprovalStaf sendiri TIDAK diubah — cuma dipindah "pemiliknya".
router.patch("/approval-hasil", setApprovalStaf);

module.exports = router;