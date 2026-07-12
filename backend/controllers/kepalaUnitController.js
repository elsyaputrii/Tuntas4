// FILE: backend/controllers/kepalaUnitController.js
//
// ── ALUR "DITOLAK STAF P4M" (baca ini sebelum ubah query di bawah) ──────
// Kalau Staf P4M menolak hasil tindak lanjut unit (lihat
// stafController.js → setApprovalStaf, approval='ditolak'), laporan itu
// TIDAK langsung balik ke tab "Laporan Hasil" untuk isi ulang bukti
// pelaksanaan saja. Sebaliknya, backend me-reset TOTAL rancangan
// tindakannya:
//   - boxing_ketidaksesuaian.approval_staf → 'ditolak'
//     (status_boxing TETAP 'di_staff', tidak diubah)
//   - rancangan_tindakan.penyebab & deskripsi → NULL
//   - rancangan_tindakan.status_review → 'menunggu_keputusan_ka'
//   - pelaksanaan_tindakan lama → DIHAPUS
//
// Efeknya: laporan tersebut otomatis muncul LAGI di getLaporanMasuk
// (tab "Ketidaksesuaian Masuk" Kepala Unit) — bukan di getLaporanHasil —
// seolah-olah laporan baru, kosong, siap diisi ulang dari awal
// (penyebab + rencana tindak lanjut), lalu harus lewat keputusan Ka P4M
// lagi sebelum kepala unit bisa isi pelaksanaan baru di "Laporan Hasil".
//
// Query getLaporanMasuk menangkap kasus ini lewat kondisi:
//   r.status_review = 'menunggu_keputusan_ka' OR b.approval_staf = 'ditolak'
//
// Sedangkan getLaporanHasil di bawah HANYA menampilkan laporan yang
// status_review-nya 'ditindaklanjuti' DAN status_boxing-nya
// 'menunggu_pelaksanaan' — kondisi ini otomatis TIDAK terpenuhi lagi
// setelah reset di atas, jadi laporan yang baru saja ditolak Staf tidak
// akan nyangkut/duplikat di tab "Laporan Hasil".
//
// Field approval_staf tetap disertakan di SELECT getLaporanHasil supaya
// frontend (ResultReportTable.tsx) masih bisa menampilkan riwayat
// "pernah ditolak Staf P4M" untuk laporan yang sudah lolos revisi.

const { pool } = require("../config/db");

// ✅ FITUR BARU: akun Ka P4M digabung dengan Kepala Unit P4M.
// Kalau yang login role-nya ka_p4m, langsung anggap dia Kepala Unit
// unit 'P4M' (tanpa perlu akun kepala_unit terpisah). Kalau role-nya
// kepala_unit biasa, cari datanya sendiri seperti biasa lewat id_pengguna.
async function getKepalaInfo(req) {
  if (req.user.role === "ka_p4m") {
    const [rows] = await pool.query(
      `SELECT id_kepala, unit FROM kepala_unit WHERE unit = 'P4M' LIMIT 1`
    );
    return rows[0] || null;
  }
  const [rows] = await pool.query(
    `SELECT id_kepala, unit FROM kepala_unit WHERE id_pengguna = ?`,
    [req.user.id]
  );
  return rows[0] || null;
}

async function getLaporanMasuk(req, res) {
  try {
    const kepala = await getKepalaInfo(req);
    if (!kepala) {
      return res.status(403).json({
        success: false,
        message: "Data kepala unit tidak ditemukan untuk akun ini.",
      });
    }
    const [rows] = await pool.query(
      `SELECT
        b.id_boxing, b.unit_tujuan, b.status AS status_boxing, b.approval_staf,
        b.catatan_approval,
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

  if (!id_boxing || !penyebab || !rencana_tindakan) {
    return res.status(400).json({
      success: false,
      message: "id_boxing, penyebab, dan rencana_tindakan wajib diisi.",
    });
  }

  try {
    const kepala = await getKepalaInfo(req);
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
  try {
    const kepala = await getKepalaInfo(req);
    if (!kepala) {
      return res.status(403).json({
        success: false,
        message: "Data kepala unit tidak ditemukan.",
      });
    }
    const [rows] = await pool.query(
      `SELECT
        b.id_boxing, b.unit_tujuan, b.status AS status_boxing, b.approval_staf,
        b.catatan_approval,
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
          r.status_review = 'ditindaklanjuti' AND b.status = 'menunggu_pelaksanaan'
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
    const kepala = await getKepalaInfo(req);
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