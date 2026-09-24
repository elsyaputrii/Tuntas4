// FILE: backend/controllers/civitasController.js
// Civitas bersifat ANONIM — tidak perlu nama, tidak perlu login

const { pool } = require("../config/db");
const { notifikasiUntukRole } = require("../utils/notifikasi");
const { generateUniqueKodeLaporan } = require("../utils/kodeLaporan");

console.log("🔥 CIVITAS CONTROLLER VERSI BARU TERLOAD");

// ============================================================
// KIRIM LAPORAN — tanpa nama, tanpa login
// Yang wajib diisi: status_pelapor, jenis_laporan, deskripsi
// nama_pelapor otomatis 'Anonim' karena DEFAULT di DB
// ============================================================
async function kirimLaporan(req, res) {
  const { status_pelapor, jenis_laporan, deskripsi, tanggal_kejadian } = req.body;

  // Validasi field yang wajib ada
  if (!status_pelapor || !jenis_laporan || !deskripsi || !tanggal_kejadian) {
    return res.status(400).json({
      success: false,
      message: "Status pelapor, jenis laporan, deskripsi, dan tanggal kejadian wajib diisi.",
    });
  }

  // Validasi format & pastikan tanggal kejadian tidak di masa depan
  const tglKejadian = new Date(`${tanggal_kejadian}T00:00:00`);
  if (isNaN(tglKejadian.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Format tanggal kejadian tidak valid.",
    });
  }
  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);
  if (tglKejadian > hariIni) {
    return res.status(400).json({
      success: false,
      message: "Tanggal kejadian tidak boleh lebih besar dari hari ini.",
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
    // ✅ Kode tiket acak — jadi "kata sandi" untuk cek status
    const kode_laporan = await generateUniqueKodeLaporan();

    // Simpan ke DB
    const [result] = await pool.query(
      `INSERT INTO laporan_ketidaksesuaian
        (kode_laporan, id_civitas, nama_pelapor, status_pelapor, jenis_laporan, deskripsi, lampiran, status, tanggal_kejadian)
       VALUES (?, NULL, 'Anonim', ?, ?, ?, ?, 'menunggu', ?)`,
      [kode_laporan, status_pelapor, jenis_laporan, deskripsi, lampiran, tanggal_kejadian]
    );

    const id_laporan = result.insertId;

    // Kasih tau semua akun staf_p4m ada laporan baru masuk (in-app + email)
    notifikasiUntukRole("staf_p4m", {
      judul: "Laporan Baru Masuk",
      pesan: `Ada laporan baru (${kode_laporan}) dari ${status_pelapor} yang perlu diperiksa dan didistribusikan.`,
      jenis: "laporan_masuk",
      link: "/staff-p4m/laporan-masuk",
    });

    return res.status(201).json({
      success: true,
      message: "Laporan berhasil dikirim! Simpan kode laporan untuk cek status.",
      data: {
        id_laporan,
        kode_laporan,
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
// CEK STATUS LAPORAN — berdasarkan kode tiket acak
// ============================================================
function normalizeKodeLaporan(kode) {
  const normalized = String(kode).trim().toUpperCase();
  if (!/^LAP-[0-9A-F]{6,12}$/.test(normalized)) return null;
  return normalized;
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

// ============================================================
// BUILD TAHAP PROGRES — diperbaiki
// ============================================================
function buildTahapProgres(laporan, ringkasan, detailUnit = []) {
  const { status } = laporan;
  const totalUnitSeharusnya = ringkasan.jumlah_unit || 0;
  const adaBoxing = totalUnitSeharusnya > 0;

  // 1. Cek Rencana dari Kepala Unit (Tahap 3)
  const unitSudahMengisi = detailUnit
    .filter((u) => u.rencana_tindakan !== null && u.rencana_tindakan.trim() !== "")
    .map((u) => u.unit_tujuan);

  const unitBelumMengisi = detailUnit
    .filter((u) => u.rencana_tindakan === null || u.rencana_tindakan.trim() === "")
    .map((u) => u.unit_tujuan);

  const semuaUnitSudahMengisi =
    adaBoxing && unitSudahMengisi.length === totalUnitSeharusnya;

  // 2. Cek Keputusan Ka P4M (Tahap 4)
  const unitSudahDireview = detailUnit
    .filter(
      (u) =>
        u.status_review === "ditindaklanjuti" ||
        u.status_review === "tidak_ditindaklanjuti"
    )
    .map((u) => u.unit_tujuan);

  const semuaUnitSudahDireview =
    semuaUnitSudahMengisi && unitSudahDireview.length === totalUnitSeharusnya;

  // 3. Filter Unit Sesuai vs Perbaikan Berkelanjutan
  const unitSesuai = detailUnit.filter(
    (u) => u.status_review === "tidak_ditindaklanjuti"
  );
  
  const unitPerbaikan = detailUnit.filter(
    (u) => u.status_review === "ditindaklanjuti"
  );

  // ⬇️ VARIABEL INI HARUS DISEBUT DULU DI SINI SEBELUM DIPAKAI DI TAHAP 5!
  const unitPerbaikanBelumHasil = unitPerbaikan
    .filter((u) => !Boolean(u.ada_pelaksanaan))
    .map((u) => u.unit_tujuan);

  // Tahap 5 otomatis CENTANG HIJAU kalau semua unit perbaikan SUDAH KIRIM HASIL
  const tahap5Selesai =
    semuaUnitSudahDireview && unitPerbaikanBelumHasil.length === 0;

  // Teks Deskripsi Tahap 5
  let deskripsiTahap5 = "";
  if (!semuaUnitSudahDireview) {
    deskripsiTahap5 = "Menunggu keputusan Ka P4M untuk seluruh unit.";
  } else if (unitSesuai.length === totalUnitSeharusnya) {
    deskripsiTahap5 = "Tidak memerlukan tindakan lanjutan.";
  } else if (unitPerbaikanBelumHasil.length > 0) {
    deskripsiTahap5 = `Menunggu laporan hasil pelaksanaan dari: ${unitPerbaikanBelumHasil.join(", ")}.`;
  } else {
    deskripsiTahap5 = "Seluruh unit telah mengirimkan laporan hasil pelaksanaan.";
  }

  // Teks Deskripsi Tahap 6
  let deskripsiTahap6 = "";
  if (status === "selesai") {
    deskripsiTahap6 = "Laporan telah resmi diselesaikan dan ditutup oleh Staf P4M.";
  } else if (tahap5Selesai) {
    deskripsiTahap6 = "Hasil pelaksanaan unit telah diterima. Menunggu verifikasi centang/silang akhir dari Staf P4M.";
  } else {
    deskripsiTahap6 = "Menunggu penyelesaian seluruh tahapan unit.";
  }

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
      id: "rencana_unit",
      title: "Kepala Unit Menyusun Rencana",
      selesai: semuaUnitSudahMengisi,
      deskripsi: semuaUnitSudahMengisi
        ? `Semua unit terkait (${unitSudahMengisi.join(", ")}) telah mengisi rencana tindak lanjut.`
        : unitSudahMengisi.length > 0
        ? `Unit yang sudah mengirim rencana: ${unitSudahMengisi.join(", ")}. Menunggu: ${unitBelumMengisi.join(", ")}.`
        : "Menunggu kepala unit menyusun penyebab dan rencana tindak lanjut.",
    },
    {
      id: "keputusan_ka",
      title: "Keputusan Ka P4M",
      selesai: semuaUnitSudahDireview,
      deskripsi: semuaUnitSudahDireview
        ? "Ka P4M telah memberikan keputusan untuk seluruh unit."
        : "Menunggu keputusan Ka P4M.",
    },
    {
      id: "pelaksanaan",
      title: "Hasil Tindak Lanjut Unit",
      selesai: tahap5Selesai,
      deskripsi: deskripsiTahap5,
    },
    {
      id: "selesai",
      title: "Laporan Selesai",
      selesai: status === "selesai",
      deskripsi: deskripsiTahap6,
    },
  ];
}

// ============================================================
// BUILD UPDATE TERBARU — perbaiki duplikasi cek jumlah_pelaksanaan
// ============================================================
function buildUpdateTerbaru(laporan, ringkasan, detailUnit = []) {
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
  if (ringkasan.jumlah_ditindaklanjuti > 0) {
    return "Ka P4M menindaklanjuti. Kepala unit menyusun hasil pelaksanaan.";
  }
  if (ringkasan.jumlah_tidak > 0) {
    return "Ka P4M menyatakan laporan sesuai dan tidak memerlukan tindakan lanjutan. Menunggu penutupan oleh Staf P4M.";
  }
  
  // ✅ UPDATE: Menyesuaikan status unit secara rinci di kotak biru
  if (ringkasan.jumlah_unit > 0) {
    const unitSudah = detailUnit
      .filter((u) => u.rencana_tindakan !== null && u.rencana_tindakan !== "")
      .map((u) => u.unit_tujuan);

    const unitBelum = detailUnit
      .filter((u) => u.rencana_tindakan === null || u.rencana_tindakan === "")
      .map((u) => u.unit_tujuan);

    if (unitBelum.length === 0) {
      return `Semua unit (${unitSudah.join(", ")}) telah mengajukan rencana. Menunggu keputusan Ka P4M.`;
    }

    if (unitSudah.length > 0) {
      return `Rencana telah dikirim oleh: ${unitSudah.join(", ")}. Menunggu rencana dari: ${unitBelum.join(", ")}.`;
    }

    return "Laporan telah didistribusikan ke unit terkait untuk ditindaklanjuti.";
  }

  if (laporan.status === "menunggu") {
    return "Laporan dalam antrian peninjauan Staf P4M.";
  }
  return "Laporan sedang diproses.";
}

async function cekStatusLaporan(req, res) {
  const { kode } = req.query;

  if (!kode) {
    return res.status(400).json({
      success: false,
      message: "Masukkan nomor tiket laporan (contoh: LAP-8F2A93C1).",
    });
  }

  try {
    const kodeNormalized = normalizeKodeLaporan(kode);
    if (!kodeNormalized) {
      return res.status(400).json({
        success: false,
        message: "Format nomor tiket tidak valid. Gunakan format contoh ( LAP-8F2A93C1).",
      });
    }

    // ✅ FIX jam salah setelah deploy: sebelumnya created_at/updated_at
    // diambil apa adanya, lalu diterjemahkan ke objek Date oleh driver
    // mysql2 berdasarkan opsi `timezone: "+07:00"` di config/db.js —
    // itu cuma benar KALAU session MySQL beneran +07:00 saat itu (diatur
    // lewat `SET time_zone` di pool.on("connection")). Command SET itu
    // tidak ditunggu/di-catch, dan banyak layanan hosting DB (proxy /
    // connection pooling) menolak atau tidak mempertahankan SET SESSION
    // semacam ini antar query. Kalau itu gagal diam-diam, session-nya
    // balik ke default host (sering UTC), tapi driver tetap memaksa
    // anggap +07:00 → jam laporan di civitas geser ±7 jam persis seperti
    // yang dilaporkan (beda dari jam di laptop/device).
    //
    // Solusi yang tidak bergantung pada timezone session MySQL sama
    // sekali: UNIX_TIMESTAMP(kolom_timestamp) dihitung MySQL langsung
    // dari nilai epoch internal kolom TIMESTAMP (yang memang selalu
    // disimpan sebagai UTC), sehingga hasilnya benar di mesin manapun,
    // apapun timezone OS/session MySQL saat itu.
    const [laporanRows] = await pool.query(
      `SELECT
        id_laporan,
        kode_laporan,
        status_pelapor,
        jenis_laporan,
        deskripsi,
        lampiran,
        status,
        created_at,
        updated_at,
        UNIX_TIMESTAMP(created_at) * 1000 AS created_at_epoch_ms,
        UNIX_TIMESTAMP(updated_at) * 1000 AS updated_at_epoch_ms
      FROM laporan_ketidaksesuaian
      WHERE kode_laporan = ?`,
      [kodeNormalized]
    );

    if (laporanRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Laporan dengan nomor tiket ${kodeNormalized} tidak ditemukan.`,
      });
    }

    const laporan = laporanRows[0];
    const id_laporan = laporan.id_laporan;

    // ... di dalam fungsi cekStatusLaporan:
    const [ringkasanRows] = await pool.query(
      `SELECT
        COUNT(DISTINCT b.id_boxing) AS jumlah_unit,
        COUNT(DISTINCT r.id_rancangan) AS jumlah_rancangan,
        SUM(CASE WHEN r.status_review = 'ditindaklanjuti' THEN 1 ELSE 0 END) AS jumlah_ditindaklanjuti,
        SUM(CASE WHEN r.status_review = 'tidak_ditindaklanjuti' THEN 1 ELSE 0 END) AS jumlah_tidak,
        COUNT(DISTINCT p.id_pelaksanaan) AS jumlah_pelaksanaan,
        SUM(CASE WHEN b.status = 'selesai' THEN 1 ELSE 0 END) AS jumlah_selesai,
        GROUP_CONCAT(DISTINCT b.unit_tujuan ORDER BY b.unit_tujuan SEPARATOR '||') AS units_raw
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
    };

    // ✅ FIX: ambil rencana tindakan / catatan PER UNIT (per id_boxing),
    // bukan digabung jadi satu string lalu diambil elemen pertamanya saja
    // (bug lama: laporan yang didistribusikan ke >1 unit kehilangan data
    // rencana tindakan dari unit ke-2 dst). Subquery dipakai supaya kalau
    // suatu saat 1 unit punya lebih dari 1 rancangan, yang diambil selalu
    // rancangan terbaru untuk unit tsb — tidak fanout jadi banyak baris.
    const [detailUnitRows] = await pool.query(
      `SELECT
        b.unit_tujuan,
        (SELECT r.deskripsi FROM rancangan_tindakan r
          WHERE r.id_boxing = b.id_boxing
          ORDER BY r.id_rancangan DESC LIMIT 1) AS rencana_tindakan,
        (SELECT r.catatan FROM rancangan_tindakan r
          WHERE r.id_boxing = b.id_boxing
          ORDER BY r.id_rancangan DESC LIMIT 1) AS catatan_staf,
        (SELECT r.status_review FROM rancangan_tindakan r
          WHERE r.id_boxing = b.id_boxing
          ORDER BY r.id_rancangan DESC LIMIT 1) AS status_review,
        -- ⬇️ TAMBAHKAN BARIS INI (Cek ke tabel pelaksanaan_tindakan)
        (SELECT p.id_pelaksanaan FROM pelaksanaan_tindakan p
          WHERE p.id_boxing = b.id_boxing
          ORDER BY p.id_pelaksanaan DESC LIMIT 1) AS ada_pelaksanaan
      FROM boxing_ketidaksesuaian b
      WHERE b.id_laporan = ?
      ORDER BY b.unit_tujuan`,
      [id_laporan]
    );

    const detail_unit = detailUnitRows.map((row) => ({
      unit_tujuan: row.unit_tujuan,
      rencana_tindakan: row.rencana_tindakan || null,
      catatan_staf: row.catatan_staf || null,
      status_review: row.status_review || null,
      ada_pelaksanaan: row.ada_pelaksanaan ? true : false,
    }));

    return res.status(200).json({
      success: true,
      data: {
        id_laporan: laporan.id_laporan,
        kode_laporan: laporan.kode_laporan,
        status_pelapor: laporan.status_pelapor,
        status_pelapor_label: labelStatusPelapor(laporan.status_pelapor),
        jenis_laporan: laporan.jenis_laporan,
        jenis_laporan_label: labelJenisLaporan(laporan.jenis_laporan),
        deskripsi: laporan.deskripsi,
        lampiran: laporan.lampiran,
        status: laporan.status,
        status_label: labelStatusLaporan(laporan.status),
        // ✅ Dibangun dari UNIX_TIMESTAMP (lihat komentar di query di atas)
        // supaya jam yang dikirim ke frontend selalu instant UTC yang
        // benar — browser user lah yang menerjemahkannya ke jam lokal
        // device mereka lewat toLocaleDateString, bukan lagi bergantung
        // pada asumsi timezone di server.
        created_at: new Date(Number(laporan.created_at_epoch_ms)).toISOString(),
        updated_at: laporan.updated_at_epoch_ms
          ? new Date(Number(laporan.updated_at_epoch_ms)).toISOString()
          : null,
        unit_tujuan: ringkasan.unit_tujuan,
        detail_unit,
        tahap_progres: buildTahapProgres(laporan, ringkasan, detail_unit),
        update_terbaru: buildUpdateTerbaru(laporan, ringkasan, detail_unit),
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
// ============================================================
async function getRiwayatLaporan(req, res) {
  const { status, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let query = `
      SELECT
        id_laporan,
        kode_laporan,
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

    const validStatus = ["menunggu", "diproses", "selesai", "ditolak"];
    if (status && validStatus.includes(status)) {
      query += " AND status = ?";
      params.push(status);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(query, params);

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error getRiwayatLaporan:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data laporan.",
    });
  }
}

module.exports = { kirimLaporan, cekStatusLaporan, getRiwayatLaporan };