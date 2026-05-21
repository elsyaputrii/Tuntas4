// FILE: backend/controllers/stafController.js
// Menangani semua fitur Staf P4M + fungsi reviewRancangan
// yang juga dipakai oleh Ka P4M lewat endpoint /staf/review-rancangan
//
// Daftar fungsi:
//   1. getLaporanMasuk      → lihat laporan masuk (status: menunggu)
//   2. getKepalaUnit        → daftar kepala unit untuk dropdown
//   3. distribusiLaporan    → kirim laporan ke kepala unit (boxing)
//   4. getProsesMonitor     → lihat semua proses + rancangan + pelaksanaan
//   5. reviewRancangan      → Ka P4M beri keputusan atas rancangan Kepala Unit ← BARU / FIX
//   6. inputHasilPemantauan → Staf P4M input hasil pemantauan lapangan
//   7. setStatusLaporan     → tutup (close) atau buka kembali laporan
//   8. getRekapitulasi      → ringkasan semua laporan dari awal sampai selesai

const { pool } = require("../config/db");

// ============================================================
// 1. GET LAPORAN MASUK
//    Tampilkan semua laporan yang belum diproses (status menunggu)
//    Dipakai di tab "Laporan Masuk" Staf P4M
// ============================================================
async function getLaporanMasuk(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
        id_laporan,
        status_pelapor,
        jenis_laporan,
        deskripsi,
        lampiran,
        status,
        created_at
      FROM laporan_ketidaksesuaian
      WHERE status = 'menunggu'
      ORDER BY created_at ASC`
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

// ============================================================
// 2. GET KEPALA UNIT
//    Ambil daftar semua kepala unit untuk dropdown distribusi
// ============================================================
async function getKepalaUnit(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id_kepala, nama, unit, nip
       FROM kepala_unit
       ORDER BY unit ASC`
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error getKepalaUnit:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data kepala unit.",
    });
  }
}

// ============================================================
// 3. DISTRIBUSI LAPORAN (BOXING)
//    Staf P4M pilih laporan + unit tujuan → simpan ke boxing
//
//    Alur:
//      a. Validasi laporan ada dan masih 'menunggu'
//      b. Insert ke boxing_ketidaksesuaian (1 row per unit)
//      c. Update status laporan → 'diproses'
//    Pakai transaction supaya atomik
//
//    Body: { id_laporan, unit_tujuan: string[], id_standar? }
// ============================================================
async function distribusiLaporan(req, res) {
  const { id_laporan, unit_tujuan, id_standar } = req.body;
  const id_pengguna = req.user.id;

  if (!id_laporan || !unit_tujuan || unit_tujuan.length === 0) {
    return res.status(400).json({
      success: false,
      message: "id_laporan dan unit_tujuan wajib diisi.",
    });
  }

  const unitArray = Array.isArray(unit_tujuan) ? unit_tujuan : [unit_tujuan];

  const conn = await pool.getConnection();
  try {
    const [stafRows] = await conn.query(
      `SELECT id_staf FROM staf_p4m WHERE id_pengguna = ?`,
      [id_pengguna]
    );

    if (stafRows.length === 0) {
      conn.release();
      return res.status(403).json({
        success: false,
        message: "Data staf P4M tidak ditemukan untuk akun ini.",
      });
    }
    const id_staf = stafRows[0].id_staf;

    const [laporanRows] = await conn.query(
      `SELECT id_laporan, status FROM laporan_ketidaksesuaian WHERE id_laporan = ?`,
      [id_laporan]
    );

    if (laporanRows.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: "Laporan tidak ditemukan." });
    }

    if (laporanRows[0].status !== "menunggu") {
      conn.release();
      return res.status(400).json({
        success: false,
        message: "Laporan ini sudah pernah didistribusikan.",
      });
    }

    await conn.beginTransaction();

    const insertedIds = [];
    for (const unit of unitArray) {
      const [result] = await conn.query(
        `INSERT INTO boxing_ketidaksesuaian
          (id_laporan, id_staf, id_kepala, unit_tujuan, id_standar, status)
         VALUES (?, ?, NULL, ?, ?, 'terdistribusi')`,
        [id_laporan, id_staf, unit, id_standar || null]
      );
      insertedIds.push(result.insertId);
    }

    await conn.query(
      `UPDATE laporan_ketidaksesuaian SET status = 'diproses' WHERE id_laporan = ?`,
      [id_laporan]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: `Laporan berhasil didistribusikan ke ${unitArray.length} unit.`,
      data: { id_boxing: insertedIds, id_laporan, unit_tujuan: unitArray },
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error distribusiLaporan:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mendistribusikan laporan.",
    });
  } finally {
    conn.release();
  }
}

// ============================================================
// 4. GET PROSES & MONITOR
//    Tampilkan semua laporan yang sudah didistribusi beserta
//    rancangan tindakan dan hasil pelaksanaan.
//
//    !! Dipakai juga oleh Ka P4M (via role ka_p4m) !!
//    → Tab "Review Rancangan Kepala Unit"
//    → Tab "Laporan Pemantauan Staf P4M"
//
//    Mengambil data dari 4 tabel sekaligus lewat LEFT JOIN
//    sehingga baris tetap muncul meski rancangan/pelaksanaan
//    belum ada (nilai NULL).
// ============================================================
async function getProsesMonitor(req, res) {
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
    console.error("Error getProsesMonitor:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data proses & monitor.",
    });
  }
}

// ============================================================
// 5. REVIEW RANCANGAN TINDAKAN  ← FUNGSI BARU (sebelumnya
//    sudah ada di module.exports tapi BELUM DIDEFINISIKAN
//    → menyebabkan ReferenceError saat server start)
//
//    Ka P4M memberi keputusan atas rancangan yang dibuat
//    oleh Kepala Unit. Ada 3 pilihan keputusan:
//      - disetujui      → Kepala Unit bisa lanjut eksekusi
//      - revisi         → Kepala Unit harus perbaiki rancangan
//      - tidak_disetujui → Rancangan ditolak
//
//    Akses: staf_p4m DAN ka_p4m (diatur di route)
//    Method: PATCH /api/staf/review-rancangan
//    Body: { id_rancangan, status_review, catatan? }
//    Catatan WAJIB jika status bukan 'disetujui'
// ============================================================
async function reviewRancangan(req, res) {
  const { id_rancangan, status_review, catatan } = req.body;

  // Validasi field wajib
  if (!id_rancangan) {
    return res.status(400).json({
      success: false,
      message: "id_rancangan wajib diisi.",
    });
  }

  const statusValid = ["disetujui", "tidak_disetujui", "revisi"];
  if (!statusValid.includes(status_review)) {
    return res.status(400).json({
      success: false,
      message: `status_review tidak valid. Pilih: ${statusValid.join(", ")}`,
    });
  }

  // Jika bukan disetujui, catatan wajib ada (agar Kepala Unit tahu
  // apa yang perlu diperbaiki atau alasan penolakan)
  if (status_review !== "disetujui" && !catatan?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Catatan wajib diisi untuk keputusan revisi atau tidak_disetujui.",
    });
  }

  try {
    // Pastikan rancangan benar-benar ada di database
    const [existing] = await pool.query(
      `SELECT id_rancangan, status_review
       FROM rancangan_tindakan
       WHERE id_rancangan = ?`,
      [id_rancangan]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Rancangan tidak ditemukan.",
      });
    }

    // Rancangan yang sudah disetujui dan sudah ada pelaksanaannya
    // tidak boleh diubah lagi (proteksi data integritas)
    if (existing[0].status_review === "disetujui") {
      const [pelaksanaan] = await pool.query(
        `SELECT p.id_pelaksanaan
         FROM pelaksanaan_tindakan p
         JOIN rancangan_tindakan r ON r.id_boxing = p.id_boxing
         WHERE r.id_rancangan = ?`,
        [id_rancangan]
      );
      if (pelaksanaan.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Rancangan yang sudah dilaksanakan tidak bisa diubah kembali.",
        });
      }
    }

    // Simpan keputusan review ke kolom status_review dan catatan
    await pool.query(
      `UPDATE rancangan_tindakan
       SET status_review = ?, catatan = ?, updated_at = NOW()
       WHERE id_rancangan = ?`,
      [status_review, catatan?.trim() || null, id_rancangan]
    );

    // Pesan sukses disesuaikan dengan keputusan yang dipilih
    const pesanSukses = {
      disetujui:       "✅ Rancangan berhasil disetujui. Kepala Unit dapat melaksanakan tindakan.",
      tidak_disetujui: "❌ Rancangan berhasil ditolak.",
      revisi:          "📝 Rancangan dikembalikan untuk direvisi oleh Kepala Unit.",
    };

    return res.status(200).json({
      success: true,
      message: pesanSukses[status_review],
    });
  } catch (error) {
    console.error("Error reviewRancangan:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan keputusan review rancangan.",
    });
  }
}

// ============================================================
// 6. INPUT HASIL PEMANTAUAN
//    Staf P4M input hasil setelah Kepala Unit melaksanakan
//    tindakan. Kepala Unit harus submit pelaksanaan dulu.
//    Body: { id_boxing, hasil, catatan?, kp_pemantauan? }
// ============================================================
async function inputHasilPemantauan(req, res) {
  const { id_boxing, hasil, catatan, kp_pemantauan } = req.body;
  const id_pengguna = req.user.id;

  if (!id_boxing || !hasil) {
    return res.status(400).json({
      success: false,
      message: "id_boxing dan hasil pemantauan wajib diisi.",
    });
  }

  try {
    const [stafRows] = await pool.query(
      `SELECT id_staf FROM staf_p4m WHERE id_pengguna = ?`,
      [id_pengguna]
    );

    if (stafRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Data staf P4M tidak ditemukan.",
      });
    }
    const id_staf = stafRows[0].id_staf;

    // Kepala Unit harus sudah submit pelaksanaan sebelum staf bisa pantau
    const [pelaksanaan] = await pool.query(
      `SELECT id_pelaksanaan FROM pelaksanaan_tindakan WHERE id_boxing = ?`,
      [id_boxing]
    );

    if (pelaksanaan.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Kepala Unit belum menginput laporan hasil pelaksanaan.",
      });
    }

    const id_pelaksanaan = pelaksanaan[0].id_pelaksanaan;

    const [result] = await pool.query(
      `INSERT INTO pemantauan
        (id_pelaksanaan, id_staf, hasil, catatan, kp_pemantauan)
       VALUES (?, ?, ?, ?, ?)`,
      [id_pelaksanaan, id_staf, hasil, catatan || null, kp_pemantauan || null]
    );

    return res.status(201).json({
      success: true,
      message: "Hasil pemantauan berhasil disimpan.",
      data: { id_pemantauan: result.insertId },
    });
  } catch (error) {
    console.error("Error inputHasilPemantauan:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan hasil pemantauan.",
    });
  }
}

// ============================================================
// 7. SET STATUS LAPORAN (CLOSE / OPEN)
//    Mengubah status akhir laporan menjadi selesai atau kembali
//    ke diproses. Dipakai oleh Staf P4M dan Ka P4M.
//
//    !! Dipakai juga oleh Ka P4M (via role ka_p4m) !!
//    → Tab "Laporan Pemantauan" → tombol "Selesai" atau "Kembalikan"
//
//    Body: { id_laporan, status }
//    status yang valid: 'selesai' | 'diproses' | 'ditolak'
// ============================================================
async function setStatusLaporan(req, res) {
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
      return res.status(404).json({
        success: false,
        message: "Laporan tidak ditemukan.",
      });
    }

    const pesanStatus = {
      selesai:  "Laporan dinyatakan SELESAI (CLOSE).",
      diproses: "Laporan dikembalikan ke status DIPROSES (OPEN).",
      ditolak:  "Laporan ditolak.",
    };

    return res.status(200).json({
      success: true,
      message: pesanStatus[status],
    });
  } catch (error) {
    console.error("Error setStatusLaporan:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengubah status laporan.",
    });
  }
}

// ============================================================
// 8. GET REKAPITULASI
//    Ringkasan semua laporan dari awal sampai selesai.
//    Khusus Staf P4M — Ka P4M tidak butuh endpoint ini
//    karena tab mereka hanya butuh /proses.
// ============================================================
async function getRekapitulasi(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
        l.id_laporan,
        l.jenis_laporan,
        l.deskripsi           AS uraian_ketidaksesuaian,
        l.lampiran            AS lampiran_laporan,
        l.status              AS status_laporan,
        l.created_at,

        b.unit_tujuan         AS nama_unit,

        r.penyebab,
        r.deskripsi           AS rencana_tindakan,
        r.status_review,

        p.deskripsi           AS hasil_tindakan,
        p.lampiran            AS lampiran_hasil,
        p.tanggal             AS tanggal_pelaksanaan
      FROM laporan_ketidaksesuaian l
      LEFT JOIN boxing_ketidaksesuaian b   ON b.id_laporan = l.id_laporan
      LEFT JOIN rancangan_tindakan r       ON r.id_boxing  = b.id_boxing
      LEFT JOIN pelaksanaan_tindakan p     ON p.id_boxing  = b.id_boxing
      ORDER BY l.created_at DESC`
    );

    const data = rows.map((row) => ({
      ...row,
      kode_laporan: `LAP-${String(row.id_laporan).padStart(5, "0")}`,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error getRekapitulasi:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data rekapitulasi.",
    });
  }
}

// ============================================================
// EXPORT SEMUA FUNGSI
// reviewRancangan sekarang sudah benar-benar didefinisikan di atas
// ============================================================
module.exports = {
  getLaporanMasuk,
  getKepalaUnit,
  distribusiLaporan,
  getProsesMonitor,
  reviewRancangan,       // ← FIX: sebelumnya di-export tapi belum ada fungsinya
  inputHasilPemantauan,
  setStatusLaporan,
  getRekapitulasi,
};