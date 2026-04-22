// ============================================================
// FILE: controllers/civitasController.js
// Fitur Civitas Akademika - TANPA LOGIN
// Civitas langsung bisa kirim laporan dan cek status
// ============================================================

const { pool } = require("../config/db");

async function kirimLaporan(req, res) {
  const { nama, status_pelapor, jenis_laporan, deskripsi } = req.body;

  // Validasi semua field wajib
  if (!nama || !status_pelapor || !jenis_laporan || !deskripsi) {
    return res.status(400).json({
      success: false,
      message: "Field nama, status, jenis laporan, dan deskripsi wajib diisi.",
    });
  }

  const jenisValid = ["masukan", "kritik", "pengaduan"];
  if (!jenisValid.includes(jenis_laporan)) {
    return res.status(400).json({
      success: false,
      message: "Jenis laporan tidak valid. Pilih: masukan, kritik, atau pengaduan.",
    });
  }

  const statusValid = ["mahasiswa", "dosen", "tendik", "masyarakat"];
  if (!statusValid.includes(status_pelapor)) {
    return res.status(400).json({
      success: false,
      message: "Status pelapor tidak valid.",
    });
  }

  // Path file lampiran jika ada
  const lampiran = req.file ? req.file.filename : null;

  try {
    // Simpan laporan langsung ke database
    // id_pengguna = NULL karena tidak ada login
    const [result] = await pool.query(
      `INSERT INTO laporan_ketidaksesuaian 
        (nama_pelapor, status_pelapor, jenis_laporan, deskripsi, lampiran, status) 
       VALUES (?, ?, ?, ?, ?, 'menunggu')`,
      [nama, status_pelapor, jenis_laporan, deskripsi, lampiran]
    );

    const id_laporan = result.insertId;

    return res.status(201).json({
      success: true,
      message: "Laporan berhasil dikirim! Simpan ID laporan Anda untuk cek status.",
      data: {
        id_laporan,
        // Kirim kode unik agar civitas bisa cek status tanpa login
        // Format: LAP-<id dengan 0 di depan> misal LAP-00042
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
      // Parse ID dari kode "LAP-00042" -> 42
      const parsed = parseInt(kode.replace("LAP-", ""), 10);
      if (isNaN(parsed)) {
        return res.status(400).json({ success: false, message: "Format kode tidak valid." });
      }
      id_laporan = parsed;
    } else {
      id_laporan = parseInt(id, 10);
    }

    // Ambil laporan beserta info tindakan (jika sudah ada)
    const [rows] = await pool.query(
      `SELECT 
        l.id_laporan,
        l.nama_pelapor,
        l.status_pelapor,
        l.jenis_laporan,
        l.deskripsi,
        l.lampiran,
        l.status,
        l.created_at,
        l.updated_at,
        b.catatan       AS catatan_staf,
        r.deskripsi     AS rencana_tindakan,
        r.pj_tindakan,
        r.status_review AS status_rancangan
      FROM laporan_ketidaksesuaian l
      LEFT JOIN borong_ketidaksesuaian b ON b.id_laporan = l.id_laporan
      LEFT JOIN rancangan_tindakan r ON r.id_borong = b.id_borong
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
    return res.status(500).json({ success: false, message: "Gagal mengambil status laporan." });
  }
}

async function getRiwayatLaporan(req, res) {
  const { nama, status, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let query = `
      SELECT 
        id_laporan,
        nama_pelapor,
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

    // Filter opsional berdasarkan nama pelapor
    if (nama) {
      query += " AND nama_pelapor LIKE ?";
      params.push(`%${nama}%`);
    }

    // Filter opsional berdasarkan status
    const validStatus = ["menunggu", "diproses", "selesai", "ditolak"];
    if (status && validStatus.includes(status)) {
      query += " AND status = ?";
      params.push(status);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(query, params);

    // Tambahkan kode laporan ke setiap item
    const dataWithKode = rows.map((row) => ({
      ...row,
      kode_laporan: `LAP-${String(row.id_laporan).padStart(5, "0")}`,
    }));

    return res.status(200).json({
      success: true,
      data: dataWithKode,
    });
  } catch (error) {
    console.error("Error getRiwayatLaporan:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data laporan." });
  }
}

module.exports = {
  kirimLaporan,
  cekStatusLaporan,
  getRiwayatLaporan,
};