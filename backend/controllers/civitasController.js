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
// CEK STATUS LAPORAN — berdasarkan nomor tiket LAP-00001
// ============================================================
function parseKodeLaporan(kode) {
  const normalized = String(kode).trim().toUpperCase();
  const match = normalized.match(/^LAP-(\d+)$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function labelStatusPelapor(v) {
  const map = {
    mahasiswa: "Mahasiswa",
    dosen: "Dosen",
    tendik: "Tendik",
    masyarakat: "Masyarakat Umum",
  };
  return map[v] || v;
}

function labelJenisLaporan(v) {
  const map = { masukan: "Masukan", kritik: "Kritik", pengaduan: "Pengaduan" };
  return map[v] || v;
}

function labelStatusLaporan(v) {
  const map = {
    menunggu: "Menunggu Peninjauan P4M",
    diproses: "Sedang Diproses",
    selesai: "Selesai",
    ditolak: "Ditolak",
  };
  return map[v] || v;
}

function buildTahapProgres(laporan, ringkasan) {
  const { status } = laporan;
  const adaBoxing = ringkasan.jumlah_unit > 0;
  const adaRancangan = ringkasan.jumlah_rancangan > 0;
  const adaDitindaklanjuti = ringkasan.jumlah_ditindaklanjuti > 0;
  const adaPelaksanaan = ringkasan.jumlah_pelaksanaan > 0;
  const adaSelesaiBoxing = ringkasan.jumlah_selesai > 0;

  return [
    {
      id: "diterima",
      title: "Laporan Diterima",
      selesai: true,
      deskripsi: "Laporan Anda telah tercatat di sistem P4M.",
    },
    {
      id: "distribusi",
      title: "Didistribusikan ke Unit",
      selesai: adaBoxing || status !== "menunggu",
      deskripsi: adaBoxing
        ? `Diteruskan ke: ${ringkasan.unit_tujuan.join(", ")}`
        : "Menunggu peninjauan dan penentuan unit oleh Staf P4M.",
    },
    {
      id: "keputusan_ka",
      title: "Keputusan Ka P4M",
      selesai: adaDitindaklanjuti || ringkasan.jumlah_tidak > 0,
      deskripsi: adaDitindaklanjuti
        ? "Ka P4M menindaklanjuti — unit melaksanakan tindakan."
        : ringkasan.jumlah_tidak > 0
        ? "Ka P4M tidak menindaklanjuti — diproses Staf P4M."
        : "Menunggu keputusan Ka P4M.",
    },
    {
      id: "pelaksanaan",
      title: "Hasil Tindak Lanjut Unit",
      selesai: adaPelaksanaan,
      deskripsi: adaPelaksanaan
        ? "Kepala unit telah melaporkan hasil."
        : adaDitindaklanjuti
        ? "Menunggu hasil dari kepala unit."
        : "Tidak memerlukan tindak lanjut unit.",
    },
    {
      id: "selesai",
      title: "Laporan Selesai",
      selesai: status === "selesai" || adaSelesaiBoxing,
      deskripsi:
        status === "selesai"
          ? "Laporan dinyatakan selesai oleh Staf P4M."
          : "Menunggu penilaian akhir Staf P4M.",
    },
  ];
}

function buildUpdateTerbaru(laporan, ringkasan) {
  if (laporan.status === "selesai") {
    return "Laporan Anda telah diselesaikan. Terima kasih atas partisipasinya.";
  }
  if (laporan.status === "ditolak") {
    return "Laporan tidak dapat dilanjutkan. Hubungi P4M Polibatam jika perlu klarifikasi.";
  }
  if (ringkasan.jumlah_pelaksanaan > 0) {
    return "Unit terkait telah menginput hasil pelaksanaan. P4M sedang memantau dan menindaklanjuti.";
  }
  if (ringkasan.jumlah_selesai > 0) {
    return "Sebagian atau seluruh unit telah diselesaikan Staf P4M.";
  }
  if (ringkasan.jumlah_pelaksanaan > 0) {
    return "Hasil tindak lanjut unit telah masuk. Staf P4M menilai selesai atau belum.";
  }
  if (ringkasan.jumlah_ditindaklanjuti > 0) {
    return "Ka P4M menindaklanjuti. Kepala unit menyusun hasil pelaksanaan.";
  }
  if (ringkasan.jumlah_tidak > 0) {
    return "Ka P4M tidak menindaklanjuti. Staf P4M memproses penutupan.";
  }
  if (ringkasan.jumlah_rancangan > 0) {
    return "Kepala unit telah mengajukan rancangan. Menunggu keputusan Ka P4M.";
  }
  if (ringkasan.jumlah_unit > 0) {
    return "Laporan telah didistribusikan ke unit terkait untuk ditindaklanjuti.";
  }
  if (laporan.status === "menunggu") {
    return "Laporan dalam antrian peninjauan Staf P4M.";
  }
  return "Laporan sedang diproses.";
}

async function cekStatusLaporan(req, res) {
  const { kode, id } = req.query;

  if (!kode && !id) {
    return res.status(400).json({
      success: false,
      message: "Masukkan nomor tiket laporan (contoh: LAP-00001).",
    });
  }

  try {
    let id_laporan;

    if (kode) {
      id_laporan = parseKodeLaporan(kode);
      if (!id_laporan) {
        return res.status(400).json({
          success: false,
          message: "Format nomor tiket tidak valid. Gunakan format LAP-00001.",
        });
      }
    } else {
      id_laporan = parseInt(id, 10);
      if (isNaN(id_laporan)) {
        return res.status(400).json({
          success: false,
          message: "ID laporan tidak valid.",
        });
      }
    }

    const [laporanRows] = await pool.query(
      `SELECT
        id_laporan,
        status_pelapor,
        jenis_laporan,
        deskripsi,
        lampiran,
        status,
        created_at,
        updated_at
      FROM laporan_ketidaksesuaian
      WHERE id_laporan = ?`,
      [id_laporan]
    );

    if (laporanRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Laporan dengan nomor tiket LAP-${String(id_laporan).padStart(5, "0")} tidak ditemukan.`,
      });
    }

    const laporan = laporanRows[0];

    const [ringkasanRows] = await pool.query(
      `SELECT
        COUNT(DISTINCT b.id_boxing) AS jumlah_unit,
        COUNT(DISTINCT r.id_rancangan) AS jumlah_rancangan,
        SUM(CASE WHEN r.status_review = 'ditindaklanjuti' THEN 1 ELSE 0 END) AS jumlah_ditindaklanjuti,
        SUM(CASE WHEN r.status_review = 'tidak_ditindaklanjuti' THEN 1 ELSE 0 END) AS jumlah_tidak,
        COUNT(DISTINCT p.id_pelaksanaan) AS jumlah_pelaksanaan,
        SUM(CASE WHEN b.status = 'selesai' THEN 1 ELSE 0 END) AS jumlah_selesai,
        GROUP_CONCAT(DISTINCT b.unit_tujuan ORDER BY b.unit_tujuan SEPARATOR '||') AS units_raw,
        GROUP_CONCAT(DISTINCT r.deskripsi ORDER BY r.id_rancangan SEPARATOR '||') AS rencana_raw,
        GROUP_CONCAT(DISTINCT r.catatan ORDER BY r.id_rancangan SEPARATOR '||') AS catatan_raw,
        GROUP_CONCAT(DISTINCT r.status_review ORDER BY r.id_rancangan SEPARATOR '||') AS review_raw
      FROM boxing_ketidaksesuaian b
      LEFT JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
      LEFT JOIN pelaksanaan_tindakan p ON p.id_boxing = b.id_boxing
      WHERE b.id_laporan = ?`,
      [id_laporan]
    );

    const raw = ringkasanRows[0] || {};
    const split = (s) => (s ? String(s).split("||").filter(Boolean) : []);

    const ringkasan = {
      jumlah_unit: Number(raw.jumlah_unit) || 0,
      jumlah_rancangan: Number(raw.jumlah_rancangan) || 0,
      jumlah_ditindaklanjuti: Number(raw.jumlah_ditindaklanjuti) || 0,
      jumlah_tidak: Number(raw.jumlah_tidak) || 0,
      jumlah_pelaksanaan: Number(raw.jumlah_pelaksanaan) || 0,
      jumlah_selesai: Number(raw.jumlah_selesai) || 0,
      unit_tujuan: split(raw.units_raw),
      rencana_tindakan: split(raw.rencana_raw)[0] || null,
      catatan_staf: split(raw.catatan_raw)[0] || null,
      status_rancangan: split(raw.review_raw)[0] || null,
    };

    const kode_laporan = `LAP-${String(laporan.id_laporan).padStart(5, "0")}`;

    return res.status(200).json({
      success: true,
      data: {
        id_laporan: laporan.id_laporan,
        kode_laporan,
        status_pelapor: laporan.status_pelapor,
        status_pelapor_label: labelStatusPelapor(laporan.status_pelapor),
        jenis_laporan: laporan.jenis_laporan,
        jenis_laporan_label: labelJenisLaporan(laporan.jenis_laporan),
        deskripsi: laporan.deskripsi,
        lampiran: laporan.lampiran,
        status: laporan.status,
        status_label: labelStatusLaporan(laporan.status),
        created_at: laporan.created_at,
        updated_at: laporan.updated_at,
        unit_tujuan: ringkasan.unit_tujuan,
        rencana_tindakan: ringkasan.rencana_tindakan,
        catatan_staf: ringkasan.catatan_staf,
        status_rancangan: ringkasan.status_rancangan,
        tahap_progres: buildTahapProgres(laporan, ringkasan),
        update_terbaru: buildUpdateTerbaru(laporan, ringkasan),
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