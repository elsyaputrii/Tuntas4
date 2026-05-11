// FILE: backend/controllers/kepalaUnitController.js
const { pool } = require("../config/db");

// ── Helper: ambil info kepala dari token ─────────────────
async function getKepalaInfo(id_pengguna) {
  const [rows] = await pool.query(
    `SELECT id_kepala, unit FROM kepala_unit WHERE id_pengguna = ?`,
    [id_pengguna]
  );
  return rows[0] || null;
}

// ── 1. GET LAPORAN MASUK ─────────────────────────────────
// Ambil semua boxing yang unit_tujuan-nya = unit kepala ini
async function getLaporanMasuk(req, res) {
  const id_pengguna = req.user.id;
  try {
    const kepala = await getKepalaInfo(id_pengguna);
    if (!kepala) {
      return res.status(403).json({
        success: false,
        message: "Data kepala unit tidak ditemukan untuk akun ini.",
      });
    }
    const [rows] = await pool.query(
      `SELECT
        b.id_boxing, b.unit_tujuan, b.status AS status_boxing,
        b.created_at AS tanggal_distribusi,
        l.id_laporan, l.jenis_laporan, l.deskripsi AS isi_laporan,
        l.lampiran AS lampiran_laporan, l.status AS status_laporan,
        l.created_at,
        r.id_rancangan, r.penyebab, r.deskripsi AS rencana_tindakan,
        r.status_review, r.catatan AS catatan_review
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l  ON l.id_laporan = b.id_laporan
      LEFT JOIN rancangan_tindakan r  ON r.id_boxing  = b.id_boxing
      WHERE b.unit_tujuan = ?
      ORDER BY b.created_at DESC`,
      [kepala.unit]
    );
    const data = rows.map((row) => ({
      ...row,
      kode_laporan: `LAP-${String(row.id_laporan).padStart(5, "0")}`,
    }));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error getLaporanMasuk:", error);
    return res.status(500).json({
      success: false, message: "Gagal mengambil data laporan masuk.",
    });
  }
}

// ── 2. SUBMIT RANCANGAN TINDAKAN ─────────────────────────
// Insert baru jika belum ada, update jika status = revisi/tidak_disetujui
// Body: { id_boxing, penyebab, rencana_tindakan }
async function submitRancangan(req, res) {
  const { id_boxing, penyebab, rencana_tindakan } = req.body;
  const id_pengguna = req.user.id;

  if (!id_boxing || !penyebab || !rencana_tindakan) {
    return res.status(400).json({
      success: false,
      message: "id_boxing, penyebab, dan rencana_tindakan wajib diisi.",
    });
  }
  try {
    const kepala = await getKepalaInfo(id_pengguna);
    if (!kepala) {
      return res.status(403).json({
        success: false, message: "Data kepala unit tidak ditemukan.",
      });
    }
    // Validasi: boxing ini memang milik unit kepala ini
    const [boxingRows] = await pool.query(
      `SELECT id_boxing FROM boxing_ketidaksesuaian
       WHERE id_boxing = ? AND unit_tujuan = ?`,
      [id_boxing, kepala.unit]
    );
    if (boxingRows.length === 0) {
      return res.status(403).json({
        success: false, message: "Laporan ini tidak ditujukan ke unit Anda.",
      });
    }
    // Cek apakah rancangan sudah pernah dibuat
    const [existing] = await pool.query(
      `SELECT id_rancangan, status_review
       FROM rancangan_tindakan WHERE id_boxing = ?`,
      [id_boxing]
    );
    if (existing.length > 0) {
      const statusBolehEdit = ["revisi", "menunggu_review", "tidak_disetujui"];
      if (!statusBolehEdit.includes(existing[0].status_review)) {
        return res.status(400).json({
          success: false,
          message: `Rancangan dengan status '${existing[0].status_review}' tidak bisa diubah.`,
        });
      }
      await pool.query(
        `UPDATE rancangan_tindakan
         SET penyebab = ?, deskripsi = ?, status_review = 'menunggu_review',
             updated_at = NOW()
         WHERE id_boxing = ?`,
        [penyebab, rencana_tindakan, id_boxing]
      );
    } else {
      await pool.query(
        `INSERT INTO rancangan_tindakan
           (id_boxing, penyebab, deskripsi, status_review)
         VALUES (?, ?, ?, 'menunggu_review')`,
        [id_boxing, penyebab, rencana_tindakan]
      );
    }
    await pool.query(
      `UPDATE boxing_ketidaksesuaian SET status = 'diproses' WHERE id_boxing = ?`,
      [id_boxing]
    );
    return res.status(200).json({
      success: true,
      message: "Rancangan tindakan berhasil dikirim. Menunggu review Staf P4M.",
    });
  } catch (error) {
    console.error("Error submitRancangan:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan rancangan." });
  }
}

// ── 3. GET LAPORAN HASIL ─────────────────────────────────
// Hanya tampilkan boxing yang rancangan-nya sudah disetujui
async function getLaporanHasil(req, res) {
  const id_pengguna = req.user.id;
  try {
    const kepala = await getKepalaInfo(id_pengguna);
    if (!kepala) {
      return res.status(403).json({
        success: false, message: "Data kepala unit tidak ditemukan.",
      });
    }
    const [rows] = await pool.query(
      `SELECT
        b.id_boxing, b.unit_tujuan, b.status AS status_boxing,
        l.id_laporan, l.jenis_laporan, l.deskripsi AS isi_laporan,
        r.id_rancangan, r.penyebab, r.deskripsi AS rencana_tindakan,
        r.status_review,
        p.id_pelaksanaan, p.deskripsi AS hasil_tindakan,
        p.lampiran AS lampiran_hasil, p.tanggal AS tanggal_pelaksanaan
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l   ON l.id_laporan = b.id_laporan
      JOIN rancangan_tindakan r        ON r.id_boxing  = b.id_boxing
      LEFT JOIN pelaksanaan_tindakan p ON p.id_boxing  = b.id_boxing
      WHERE b.unit_tujuan = ? AND r.status_review = 'disetujui'
      ORDER BY b.created_at DESC`,
      [kepala.unit]
    );
    const data = rows.map((row) => ({
      ...row,
      kode_laporan: `LAP-${String(row.id_laporan).padStart(5, "0")}`,
    }));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error getLaporanHasil:", error);
    return res.status(500).json({
      success: false, message: "Gagal mengambil data laporan hasil.",
    });
  }
}

// ── 4. SUBMIT PELAKSANAAN ────────────────────────────────
// Kepala Unit input hasil nyata + opsional upload bukti foto/dokumen
// Body (multipart/form-data): { id_boxing, deskripsi, tanggal }
// File: lampiran (opsional, max 5MB, format jpg/png/pdf)
async function submitPelaksanaan(req, res) {
  const { id_boxing, deskripsi, tanggal } = req.body;
  const id_pengguna = req.user.id;
  const lampiran    = req.file ? req.file.filename : null;

  if (!id_boxing || !deskripsi || !tanggal) {
    return res.status(400).json({
      success: false,
      message: "id_boxing, deskripsi, dan tanggal wajib diisi.",
    });
  }
  try {
    const kepala = await getKepalaInfo(id_pengguna);
    if (!kepala) {
      return res.status(403).json({
        success: false, message: "Data kepala unit tidak ditemukan.",
      });
    }
    // Pastikan boxing ini milik unit kepala dan rancangan sudah disetujui
    const [boxingRows] = await pool.query(
      `SELECT b.id_boxing FROM boxing_ketidaksesuaian b
       JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
       WHERE b.id_boxing = ? AND b.unit_tujuan = ? AND r.status_review = 'disetujui'`,
      [id_boxing, kepala.unit]
    );
    if (boxingRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Laporan tidak ditemukan atau rancangan belum disetujui.",
      });
    }
    const [existingPelaksanaan] = await pool.query(
      `SELECT id_pelaksanaan FROM pelaksanaan_tindakan WHERE id_boxing = ?`,
      [id_boxing]
    );
    if (existingPelaksanaan.length > 0) {
      // Update jika sudah pernah ada
      const q = lampiran
        ? `UPDATE pelaksanaan_tindakan
           SET deskripsi = ?, tanggal = ?, lampiran = ?, updated_at = NOW()
           WHERE id_boxing = ?`
        : `UPDATE pelaksanaan_tindakan
           SET deskripsi = ?, tanggal = ?, updated_at = NOW()
           WHERE id_boxing = ?`;
      const p = lampiran
        ? [deskripsi, tanggal, lampiran, id_boxing]
        : [deskripsi, tanggal, id_boxing];
      await pool.query(q, p);
    } else {
      await pool.query(
        `INSERT INTO pelaksanaan_tindakan
           (id_boxing, id_kepala, deskripsi, lampiran, tanggal)
         VALUES (?, ?, ?, ?, ?)`,
        [id_boxing, kepala.id_kepala, deskripsi, lampiran, tanggal]
      );
    }
    await pool.query(
      `UPDATE boxing_ketidaksesuaian SET status = 'selesai' WHERE id_boxing = ?`,
      [id_boxing]
    );
    return res.status(200).json({
      success: true,
      message: "Laporan hasil tindak lanjut berhasil disimpan.",
    });
  } catch (error) {
    console.error("Error submitPelaksanaan:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan pelaksanaan." });
  }
}

module.exports = { getLaporanMasuk, submitRancangan, getLaporanHasil, submitPelaksanaan };