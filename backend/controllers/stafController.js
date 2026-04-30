// FILE: backend/controllers/stafController.js
// Semua fitur Staff P4M sesuai diagram alur:
//   1. Lihat laporan masuk
//   2. Distribusikan ke kepala unit (boxing)
//   3. Proses & pantau
//   4. Input hasil pemantauan
//   5. Set status laporan (close/open)
//   6. Rekapitulasi

const { pool } = require("../config/db");

// ============================================================
// 1. GET LAPORAN MASUK
//    Tampilkan semua laporan yang belum diproses (status menunggu)
//    Dipakai di tab "Laporan Masuk"
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
      // ASC = yang paling lama menunggu tampil paling atas
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
//    Staf P4M pilih laporan + kepala unit → simpan ke boxing
//
//    Alur:
//      a. Validasi laporan ada dan masih 'menunggu'
//      b. Insert ke boxing_ketidaksesuaian
//      c. Update status laporan → 'diproses'
//    Pakai transaction supaya atomik (kalau gagal, semua dibatalkan)
//
//    Body: { id_laporan, id_kepala, id_standar (opsional) }
//    id_staf diambil dari token JWT (lebih aman dari body)
// ============================================================
async function distribusiLaporan(req, res) {
  const { id_laporan, id_kepala, id_standar } = req.body;
  const id_pengguna = req.user.id; // dari token JWT

  if (!id_laporan || !id_kepala) {
    return res.status(400).json({
      success: false,
      message: "id_laporan dan id_kepala wajib diisi.",
    });
  }

  const conn = await pool.getConnection();
  try {
    // Ambil id_staf berdasarkan id_pengguna dari token
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

    // Cek laporan ada dan statusnya masih 'menunggu'
    const [laporanRows] = await conn.query(
      `SELECT id_laporan, status
       FROM laporan_ketidaksesuaian
       WHERE id_laporan = ?`,
      [id_laporan]
    );

    if (laporanRows.length === 0) {
      conn.release();
      return res.status(404).json({
        success: false,
        message: "Laporan tidak ditemukan.",
      });
    }

    if (laporanRows[0].status !== "menunggu") {
      conn.release();
      return res.status(400).json({
        success: false,
        message: "Laporan ini sudah pernah didistribusikan.",
      });
    }

    // Mulai transaction
    await conn.beginTransaction();

    // Langkah 1: Insert ke boxing_ketidaksesuaian
    const [result] = await conn.query(
      `INSERT INTO boxing_ketidaksesuaian
        (id_laporan, id_staf, id_kepala, id_standar, status)
       VALUES (?, ?, ?, ?, 'terdistribusi')`,
      [id_laporan, id_staf, id_kepala, id_standar || null]
    );

    // Langkah 2: Update status laporan → 'diproses'
    await conn.query(
      `UPDATE laporan_ketidaksesuaian
       SET status = 'diproses'
       WHERE id_laporan = ?`,
      [id_laporan]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: "Laporan berhasil didistribusikan ke Kepala Unit.",
      data: {
        id_boxing:  result.insertId,
        id_laporan,
        id_kepala,
        status:     "terdistribusi",
      },
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
//    Tampilkan semua laporan yang sudah didistribusi
//    beserta rancangan tindakan dan hasil pelaksanaan
//    Dipakai di tab "Proses & Pantau"
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
        b.status              AS status_boxing,

        ku.nama               AS nama_kepala_unit,
        ku.unit               AS nama_unit,

        r.penyebab,
        r.deskripsi           AS rencana_tindakan,
        r.status_review,
        r.catatan             AS catatan_kepala,

        p.deskripsi           AS hasil_tindakan,
        p.lampiran            AS lampiran_hasil,
        p.tanggal             AS tanggal_pelaksanaan
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l    ON l.id_laporan = b.id_laporan
      JOIN kepala_unit ku               ON ku.id_kepala = b.id_kepala
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
// 5. INPUT HASIL PEMANTAUAN
//    Staf P4M input hasil setelah kepala unit melaksanakan
//    Body: { id_boxing, hasil, catatan (opsional), kp_pemantauan (opsional) }
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
    // Ambil id_staf dari token
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

    // Cek pelaksanaan sudah ada (kepala unit harus submit dulu)
    const [pelaksanaan] = await pool.query(
      `SELECT id_pelaksanaan
       FROM pelaksanaan_tindakan
       WHERE id_boxing = ?`,
      [id_boxing]
    );

    if (pelaksanaan.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Kepala Unit belum menginput laporan hasil pelaksanaan.",
      });
    }

    const id_pelaksanaan = pelaksanaan[0].id_pelaksanaan;

    // Simpan pemantauan
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
// 6. SET STATUS LAPORAN (CLOSE / OPEN)
//    Staf P4M menentukan status akhir laporan
//    Body: { id_laporan, status }
//    status yang boleh: 'selesai' (CLOSE) atau 'diproses' (OPEN)
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
      `UPDATE laporan_ketidaksesuaian
       SET status = ?
       WHERE id_laporan = ?`,
      [status, id_laporan]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Laporan tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Status laporan berhasil diubah menjadi '${status}'.`,
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
// 7. GET REKAPITULASI
//    Ringkasan semua laporan dari awal sampai selesai
//    Dipakai di tab "Rekapitulasi"
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

        ku.unit               AS nama_unit,

        r.penyebab,
        r.deskripsi           AS rencana_tindakan,
        r.status_review,

        p.deskripsi           AS hasil_tindakan,
        p.lampiran            AS lampiran_hasil,
        p.tanggal             AS tanggal_pelaksanaan
      FROM laporan_ketidaksesuaian l
      LEFT JOIN boxing_ketidaksesuaian b   ON b.id_laporan = l.id_laporan
      LEFT JOIN kepala_unit ku             ON ku.id_kepala = b.id_kepala
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

module.exports = {
  getLaporanMasuk,
  getKepalaUnit,
  distribusiLaporan,
  getProsesMonitor,
  inputHasilPemantauan,
  setStatusLaporan,
  getRekapitulasi,
};