// FILE: backend/controllers/kepalaUnitController.js
//
// ── CATATAN PERBAIKAN (sesi ini) ────────────────────────────────────────
// [getLaporanHasil] Sebelumnya query ini HANYA menerima boxing dengan
// status='menunggu_pelaksanaan'. Tapi sekarang (lihat stafController.js)
// laporan yang DITOLAK Staf P4M tetap berstatus 'di_staff' (bukan
// 'menunggu_pelaksanaan') — supaya beda secara state dari laporan yang
// memang baru pertama kali ditindaklanjuti Ka P4M. Akibatnya tanpa fix
// ini, laporan yang ditolak Staf TIDAK AKAN PERNAH muncul lagi di tab
// "Laporan Hasil" Kepala Unit untuk direvisi — padahal itu instruksi
// dari approval_staf='ditolak'.
//
// FIX: query getLaporanHasil sekarang menerima DUA kondisi (OR):
//   a) status_boxing = 'menunggu_pelaksanaan' DAN status_review =
//      'ditindaklanjuti'  → kasus normal: pertama kali isi pelaksanaan.
//   b) status_boxing = 'di_staff' DAN approval_staf = 'ditolak'
//      → kasus revisi: Staf menolak hasil sebelumnya, Kepala Unit harus
//        isi ulang pelaksanaan baru.
//
// Field approval_staf juga ditambahkan ke SELECT supaya frontend
// (ResultReportTable.tsx) bisa menampilkan catatan "Ditolak Staf P4M,
// silakan revisi" kalau perlu.

const { pool } = require("../config/db");

async function getKepalaInfo(id_pengguna) {
  const [rows] = await pool.query(
    `SELECT id_kepala, unit FROM kepala_unit WHERE id_pengguna = ?`,
    [id_pengguna]
  );
  return rows[0] || null;
}

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
        r.status_review, r.aksi_masukan, r.catatan AS catatan_review
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l ON l.id_laporan = b.id_laporan
      LEFT JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
      WHERE b.id_kepala = ?
        AND b.status NOT IN ('selesai')
        AND (
          r.id_rancangan IS NULL
          OR r.status_review = 'menunggu_keputusan_ka'
          OR b.approval_staf = 'ditolak'
        )
      ORDER BY b.created_at DESC`,
      [kepala.id_kepala]
    );
    const data = rows.map((row) => ({
      ...row,
      kode_laporan: `LAP-${String(row.id_laporan).padStart(5, "0")}`,
    }));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error getLaporanMasuk:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data laporan masuk.",
    });
  }
}

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
        success: false,
        message: "Data kepala unit tidak ditemukan.",
      });
    }

    const [boxingRows] = await pool.query(
      `SELECT id_boxing, status FROM boxing_ketidaksesuaian
       WHERE id_boxing = ? AND id_kepala = ?`,
      [id_boxing, kepala.id_kepala]
    );
    if (boxingRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Laporan ini tidak ditujukan ke unit Anda.",
      });
    }

    const [existing] = await pool.query(
      `SELECT id_rancangan, status_review FROM rancangan_tindakan WHERE id_boxing = ?`,
      [id_boxing]
    );

    if (existing.length > 0) {
      if (existing[0].status_review !== "menunggu_keputusan_ka") {
        return res.status(400).json({
          success: false,
          message: "Rancangan sudah diputuskan Ka P4M dan tidak bisa diubah dari sini.",
        });
      }
      await pool.query(
        `UPDATE rancangan_tindakan
         SET penyebab = ?, deskripsi = ?, updated_at = NOW()
         WHERE id_boxing = ?`,
        [penyebab, rencana_tindakan, id_boxing]
      );
    } else {
      await pool.query(
        `INSERT INTO rancangan_tindakan (id_boxing, penyebab, deskripsi, status_review)
         VALUES (?, ?, ?, 'menunggu_keputusan_ka')`,
        [id_boxing, penyebab, rencana_tindakan]
      );
    }

    await pool.query(
      `UPDATE boxing_ketidaksesuaian SET status = 'diproses' WHERE id_boxing = ?`,
      [id_boxing]
    );

    return res.status(200).json({
      success: true,
      message: "Rancangan dikirim ke Ka P4M untuk keputusan ditindaklanjuti atau tidak.",
    });
  } catch (error) {
    console.error("Error submitRancangan:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan rancangan." });
  }
}

// ✅ FIX: query getLaporanHasil sekarang punya 2 kondisi (OR) — lihat
// penjelasan di komentar atas file. Ditambahkan juga b.approval_staf ke
// SELECT supaya frontend bisa kasih konteks "ditolak, perlu revisi".
async function getLaporanHasil(req, res) {
  const id_pengguna = req.user.id;
  try {
    const kepala = await getKepalaInfo(id_pengguna);
    if (!kepala) {
      return res.status(403).json({
        success: false,
        message: "Data kepala unit tidak ditemukan.",
      });
    }
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
      WHERE b.id_kepala = ?
        AND (
          (r.status_review = 'ditindaklanjuti' AND b.status = 'menunggu_pelaksanaan')
          OR
          (b.status = 'di_staff' AND b.approval_staf = 'ditolak')
        )
      ORDER BY b.created_at DESC`,
      [kepala.id_kepala]
    );
    const data = rows.map((row) => ({
      ...row,
      kode_laporan: `LAP-${String(row.id_laporan).padStart(5, "0")}`,
    }));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error getLaporanHasil:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data laporan hasil.",
    });
  }
}

async function submitPelaksanaan(req, res) {
  const { id_boxing, deskripsi, tanggal } = req.body;
  const id_pengguna = req.user.id;
  const lampiran = req.file ? req.file.filename : null;

  if (!id_boxing || !deskripsi || !tanggal) {
    return res.status(400).json({
      success: false,
      message: "id_boxing, deskripsi, dan tanggal wajib diisi.",
    });
  }

  if (!lampiran) {
    return res.status(400).json({
      success: false,
      message: "Gambar bukti pelaksanaan wajib diunggah.",
    });
  }

  try {
    const kepala = await getKepalaInfo(id_pengguna);
    if (!kepala) {
      return res.status(403).json({
        success: false,
        message: "Data kepala unit tidak ditemukan.",
      });
    }

    // ✅ FIX: validasi sekarang juga menerima kasus revisi (di_staff +
    // ditolak), bukan cuma 'menunggu_pelaksanaan'. Tanpa ini, submit
    // ulang setelah ditolak Staf akan ditolak backend dengan 403.
    const [boxingRows] = await pool.query(
      `SELECT b.id_boxing, b.id_laporan, b.status AS status_boxing, b.approval_staf,
              l.created_at AS tanggal_laporan, r.updated_at AS tanggal_ditindaklanjuti
       FROM boxing_ketidaksesuaian b
       JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
       JOIN laporan_ketidaksesuaian l ON l.id_laporan = b.id_laporan
       WHERE b.id_boxing = ? AND b.id_kepala = ?
         AND r.status_review = 'ditindaklanjuti'
         AND (
           b.status = 'menunggu_pelaksanaan'
           OR (b.status = 'di_staff' AND b.approval_staf = 'ditolak')
         )`,
      [id_boxing, kepala.id_kepala]
    );

    if (boxingRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Laporan tidak ditemukan atau belum disetujui untuk ditindaklanjuti oleh Ka P4M.",
      });
    }

    const id_laporan = boxingRows[0].id_laporan;
    const tanggalLaporan = new Date(boxingRows[0].tanggal_laporan);
    tanggalLaporan.setHours(0, 0, 0, 0);
    const tanggalDitindaklanjuti = boxingRows[0].tanggal_ditindaklanjuti
      ? new Date(boxingRows[0].tanggal_ditindaklanjuti)
      : tanggalLaporan;
    tanggalDitindaklanjuti.setHours(0, 0, 0, 0);
    const minTanggal = tanggalDitindaklanjuti >= tanggalLaporan ? tanggalDitindaklanjuti : tanggalLaporan;
    const tanggalInput = new Date(tanggal);
    tanggalInput.setHours(0, 0, 0, 0);
    if (tanggalInput < minTanggal) {
      return res.status(400).json({
        success: false,
        message: "Tanggal pelaksanaan tidak boleh lebih awal dari tanggal Ka P4M menindaklanjuti laporan.",
      });
    }

    const [existingPelaksanaan] = await pool.query(
      `SELECT id_pelaksanaan FROM pelaksanaan_tindakan WHERE id_boxing = ?`,
      [id_boxing]
    );

    if (existingPelaksanaan.length > 0) {
      await pool.query(
        `UPDATE pelaksanaan_tindakan
         SET deskripsi = ?, tanggal = ?, lampiran = ?, updated_at = NOW()
         WHERE id_boxing = ?`,
        [deskripsi, tanggal, lampiran, id_boxing]
      );
    } else {
      await pool.query(
        `INSERT INTO pelaksanaan_tindakan (id_boxing, id_kepala, deskripsi, lampiran, tanggal)
         VALUES (?, ?, ?, ?, ?)`,
        [id_boxing, kepala.id_kepala, deskripsi, lampiran, tanggal]
      );
    }

    // ✅ FIX: reset approval_staf balik ke 'menunggu' setiap kali Kepala
    // Unit submit ulang (penting untuk kasus revisi setelah ditolak),
    // supaya Staf P4M tahu ini hasil BARU yang perlu di-review lagi.
    await pool.query(
      `UPDATE boxing_ketidaksesuaian SET status = 'di_staff', approval_staf = 'menunggu' WHERE id_boxing = ?`,
      [id_boxing]
    );
    await pool.query(
      `UPDATE laporan_ketidaksesuaian SET status = 'diproses' WHERE id_laporan = ?`,
      [id_laporan]
    );

    return res.status(200).json({
      success: true,
      message: "Hasil tindak lanjut dikirim ke Staf P4M untuk penilaian selesai atau belum.",
    });
  } catch (error) {
    console.error("Error submitPelaksanaan:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan pelaksanaan." });
  }
}

module.exports = { getLaporanMasuk, submitRancangan, getLaporanHasil, submitPelaksanaan };