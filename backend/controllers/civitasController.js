// FILE: backend/controllers/civitasController.js
// Civitas bersifat ANONIM — tidak perlu nama, tidak perlu login

const { pool } = require("../config/db");

// ============================================================
// KIRIM LAPORAN — tanpa nama, tanpa login
// Yang wajib diisi: status_pelapor, jenis_laporan, deskripsi
// nama_pelapor otomatis 'Anonim' karena DEFAULT di DB
// ============================================================
async function kirimLaporan(req, res) {
  const { status_pelapor, jenis_laporan, deskripsi } = req.body;

  // Validasi field yang wajib ada
  if (!status_pelapor || !jenis_laporan || !deskripsi) {
    return res.status(400).json({
      success: false,
      message: "Status pelapor, jenis laporan, dan deskripsi wajib diisi.",
    });
  }

  // Validasi nilai jenis_laporan harus salah satu dari enum di DB
  const jenisValid = ["masukan", "kritik", "pengaduan"];
  if (!jenisValid.includes(jenis_laporan)) {
    return res.status(400).json({
      success: false,
      message: "Jenis laporan tidak valid. Pilih: masukan, kritik, atau pengaduan.",
    });
  }

  // Validasi nilai status_pelapor harus salah satu dari enum di DB
  const statusValid = ["mahasiswa", "dosen", "tendik", "masyarakat"];
  if (!statusValid.includes(status_pelapor)) {
    return res.status(400).json({
      success: false,
      message: "Status pelapor tidak valid.",
    });
  }

  // Ambil nama file lampiran kalau ada, kalau tidak ada → NULL
  const lampiran = req.file ? req.file.filename : null;

  try {
    // Simpan ke DB
    // id_civitas  = NULL  → anonim, tidak perlu akun
    // nama_pelapor = 'Anonim' → karena laporan anonim
    const [result] = await pool.query(
      `INSERT INTO laporan_ketidaksesuaian
        (id_civitas, nama_pelapor, status_pelapor, jenis_laporan, deskripsi, lampiran, status)
       VALUES (NULL, 'Anonim', ?, ?, ?, ?, 'menunggu')`,
      [status_pelapor, jenis_laporan, deskripsi, lampiran]
    );

    const id_laporan = result.insertId;

    return res.status(201).json({
      success: true,
      message: "Laporan berhasil dikirim! Simpan kode laporan untuk cek status.",
      data: {
        id_laporan,
        // Format kode: LAP-00001, LAP-00002, dst
        kode_laporan: `LAP-${String(id_laporan).padStart(5, "0")}`,
        status: "menunggu",
      },
    });
  } catch (error) {
    console.error("Error kirimLaporan:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan laporan. Coba lagi nanti.",
    });
  }
}

// ============================================================
// CEK STATUS LAPORAN
// Input: kode (LAP-00001) atau id angka
//
// PERBAIKAN dari kode lama:
//   ❌ borong_ketidaksesuaian → ✅ boxing_ketidaksesuaian
//   ❌ r.id_borong            → ✅ r.id_boxing (tidak ada di rancangan, pakai b.id_boxing)
//   ❌ b.catatan              → ✅ r.catatan (catatan ada di rancangan_tindakan)
//   ❌ r.pj_tindakan          → dihapus (kolom ini tidak ada di DB)
// ============================================================
async function cekStatusLaporan(req, res) {
  const { kode, id } = req.query;

  if (!kode && !id) {
    return res.status(400).json({
      success: false,
      message: "Masukkan kode laporan (contoh: LAP-00042) atau ID laporan.",
    });
  }

  try {
    let id_laporan;

    if (kode) {
      // Ubah "LAP-00042" → angka 42
      const parsed = parseInt(kode.replace("LAP-", ""), 10);
      if (isNaN(parsed)) {
        return res.status(400).json({
          success: false,
          message: "Format kode tidak valid. Gunakan format LAP-00001.",
        });
      }
      id_laporan = parsed;
    } else {
      id_laporan = parseInt(id, 10);
    }

    // Query dengan JOIN yang sudah diperbaiki sesuai DB asli
    const [rows] = await pool.query(
      `SELECT
        l.id_laporan,
        l.status_pelapor,
        l.jenis_laporan,
        l.deskripsi,
        l.lampiran,
        l.status,
        l.created_at,
        l.updated_at,
        r.catatan       AS catatan_staf,
        r.deskripsi     AS rencana_tindakan,
        r.status_review AS status_rancangan
      FROM laporan_ketidaksesuaian l
      LEFT JOIN boxing_ketidaksesuaian b ON b.id_laporan = l.id_laporan
      LEFT JOIN rancangan_tindakan r     ON r.id_boxing  = b.id_boxing
      WHERE l.id_laporan = ?`,
      [id_laporan]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Laporan dengan kode LAP-${String(id_laporan).padStart(5, "0")} tidak ditemukan.`,
      });
    }

    const laporan = rows[0];

    return res.status(200).json({
      success: true,
      data: {
        ...laporan,
        kode_laporan: `LAP-${String(laporan.id_laporan).padStart(5, "0")}`,
      },
    });
  } catch (error) {
    console.error("Error cekStatusLaporan:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil status laporan.",
    });
  }
}

// ============================================================
// GET RIWAYAT LAPORAN
// Dipakai oleh staf P4M untuk lihat semua laporan masuk
// Bisa difilter by status
// ============================================================
async function getRiwayatLaporan(req, res) {
  const { status, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let query = `
      SELECT
        id_laporan,
        status_pelapor,
        jenis_laporan,
        deskripsi,
        lampiran,
        status,
        created_at
      FROM laporan_ketidaksesuaian
      WHERE 1=1
    `;
    const params = [];

    // Filter opsional berdasarkan status laporan
    const validStatus = ["menunggu", "diproses", "selesai", "ditolak"];
    if (status && validStatus.includes(status)) {
      query += " AND status = ?";
      params.push(status);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(query, params);

    // Tambahkan kode_laporan ke setiap baris hasil
    const dataWithKode = rows.map((row) => ({
      ...row,
      kode_laporan: `LAP-${String(row.id_laporan).padStart(5, "0")}`,
    }));

    return res.status(200).json({ success: true, data: dataWithKode });
  } catch (error) {
    console.error("Error getRiwayatLaporan:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data laporan.",
    });
  }
}

module.exports = { kirimLaporan, cekStatusLaporan, getRiwayatLaporan };