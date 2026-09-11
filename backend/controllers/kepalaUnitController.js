// FILE: backend/controllers/kepalaUnitController.js
//
// // ── ALUR "DIBUKA KEMBALI KE UNIT" (baca ini sebelum ubah query di bawah) ──
// Keputusan akhir (Siap/Belum Siap atas hasil tindak lanjut) HANYA wewenang
// Staf P4M, lewat PATCH /api/staf/approval-hasil (fungsi setApprovalStaf di
// stafController.js). Sempat dipindah ke Ka P4M (PATCH /api/ka-p4m/approval-hasil),
// tapi route itu sudah DICABUT — sekarang Ka P4M cuma read-only monitor lewat
// GET /api/ka-p4m/proses (lihat KaP4MHasilTable.tsx di frontend). Kalau Staf
// P4M menolak ("Belum Siap") hasil tindak lanjut unit:
//     (status_boxing TETAP 'di_staff', tidak diubah)
//   - rancangan_tindakan.status_review → 'menunggu_keputusan_ka'
//   - rancangan_tindakan.penyebab & deskripsi → TETAP DIPERTAHANKAN
//     (TIDAK di-NULL-kan) supaya Kepala Unit tidak perlu mengetik ulang
//     dari nol; kotaknya hanya dibuka lagi supaya bisa diedit.
//   - pelaksanaan_tindakan lama → DIHAPUS (memang ini yang mau direvisi)
//
// Efeknya: laporan tersebut otomatis muncul LAGI di getLaporanMasuk
// (tab "Ketidaksesuaian Masuk" Kepala Unit) — bukan di getLaporanHasil —
// dengan Penyebab & Rencana Tindak Lanjut SEBELUMNYA sudah terisi (siap
// diedit ulang oleh Kepala Unit), lalu harus lewat keputusan Ka P4M lagi
// sebelum Kepala Unit bisa isi pelaksanaan baru di "Laporan Hasil".
//
// Query getLaporanMasuk menangkap kasus ini lewat kondisi:
//   r.status_review = 'menunggu_keputusan_ka' OR b.approval_staf = 'ditolak'
//
// Sedangkan getLaporanHasil di bawah HANYA menampilkan laporan yang
// status_review-nya 'ditindaklanjuti' DAN status_boxing-nya
// 'menunggu_pelaksanaan' — kondisi ini otomatis TIDAK terpenuhi lagi
// setelah reopen di atas, jadi laporan yang baru saja ditolak tidak akan
// nyangkut/duplikat di tab "Laporan Hasil".
//
// Field approval_staf tetap disertakan di SELECT getLaporanHasil supaya
// frontend (ResultReportTable.tsx) masih bisa menampilkan riwayat
// "pernah ditolak, sudah direvisi" untuk laporan yang sudah lolos revisi.

const { pool } = require("../config/db");
const { notifikasiUntukRole } = require("../utils/notifikasi");

// ✅ FITUR BARU: akun Ka P4M digabung dengan Kepala Unit P4M.
// Kalau yang login role-nya ka_p4m, langsung anggap dia Kepala Unit
// unit 'P4M' (tanpa perlu akun kepala_unit terpisah). Kalau role-nya
// kepala_unit biasa, cari datanya sendiri seperti biasa lewat id_pengguna.
async function getKepalaInfo(req) {
  if (req.user.role === "ka_p4m") {
    const [rows] = await pool.query(
      `SELECT id_kepala, unit FROM kepala_unit WHERE unit = 'P4M' LIMIT 1`,
    );
    return rows[0] || null;
  }
  const [rows] = await pool.query(
    `SELECT id_kepala, unit FROM kepala_unit WHERE id_pengguna = ?`,
    [req.user.id],
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
        l.id_laporan, l.kode_laporan, l.jenis_laporan, l.deskripsi AS isi_laporan,
        l.lampiran AS lampiran_laporan, l.status AS status_laporan,
        l.created_at,
        COALESCE(l.tanggal_kejadian, l.created_at) AS tanggal_laporan,
        r.id_rancangan,
        -- ✅ FIX (permintaan user): tiap unit tujuan (baris boxing_ketidaksesuaian
        -- miliknya sendiri, dibedakan lewat id_boxing) WAJIB independen —
        -- Penyebab & Rencana Tindak Lanjut yang ditampilkan HANYA milik unit
        -- ini sendiri (r.penyebab / r.deskripsi), tidak lagi diisi otomatis
        -- dari draft/isian Kepala Unit lain untuk laporan yang sama. Kalau
        -- unit ini belum pernah mengirim, kotaknya kosong — bukan hasil
        -- salinan unit lain.
        r.penyebab,
        r.deskripsi AS rencana_tindakan,
        r.status_review, r.aksi_masukan, r.catatan AS catatan_review
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l ON l.id_laporan = b.id_laporan
      LEFT JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
      WHERE b.id_kepala = ?
        AND b.status NOT IN ('selesai')
        AND (
          r.id_rancangan IS NULL
          OR r.status_review = 'menunggu_keputusan_ka'
          -- ✅ FIX (permintaan user): "ditolak" oleh Staf P4M sekarang
          -- mengembalikan laporan LANGSUNG ke tab "Laporan Hasil"
          -- (status_boxing = 'menunggu_pelaksanaan', lihat setApprovalStaf
          -- di stafController.js) — BUKAN lagi ke "Ketidaksesuaian Masuk".
          -- Kondisi approval_staf='ditolak' di sini karena itu HANYA
          -- dipakai untuk skenario lama (kalau suatu saat status boxing
          -- masih 'di_staff' dengan approval 'ditolak'); dibatasi supaya
          -- TIDAK ikut menangkap laporan yang sudah dipindah ke
          -- 'menunggu_pelaksanaan' oleh alur revisi baru, yang harusnya
          -- HANYA muncul di "Laporan Hasil", bukan di "Masuk" lagi.
          OR (b.status = 'di_staff' AND b.approval_staf = 'ditolak')
        )
      ORDER BY b.created_at DESC`,
      [kepala.id_kepala],
    );
    // ✅ kode_laporan sekarang datang langsung dari kolom l.kode_laporan
    // (token acak), bukan dihitung ulang dari id_laporan yang sequential.
    return res.status(200).json({ success: true, data: rows });
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
      `SELECT id_boxing, id_laporan, status FROM boxing_ketidaksesuaian
       WHERE id_boxing = ? AND id_kepala = ?`,
      [id_boxing, kepala.id_kepala],
    );
    if (boxingRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Laporan ini tidak ditujukan ke unit Anda.",
      });
    }
    const [existing] = await pool.query(
      `SELECT id_rancangan, status_review FROM rancangan_tindakan WHERE id_boxing = ?`,
      [id_boxing],
    );

    if (existing.length > 0) {
      if (existing[0].status_review !== "menunggu_keputusan_ka") {
        return res.status(400).json({
          success: false,
          message:
            "Rancangan sudah diputuskan Ka P4M dan tidak bisa diubah dari sini.",
        });
      }
      await pool.query(
        `UPDATE rancangan_tindakan
         SET penyebab = ?, deskripsi = ?, updated_at = NOW()
         WHERE id_boxing = ?`,
        [penyebab, rencana_tindakan, id_boxing],
      );
    } else {
      await pool.query(
        `INSERT INTO rancangan_tindakan (id_boxing, penyebab, deskripsi, status_review)
         VALUES (?, ?, ?, 'menunggu_keputusan_ka')`,
        [id_boxing, penyebab, rencana_tindakan],
      );
    }

    await pool.query(
      `UPDATE boxing_ketidaksesuaian SET status = 'diproses' WHERE id_boxing = ?`,
      [id_boxing],
    );

    // ✅ FIX (permintaan user): TIDAK ADA LAGI penyimpanan draft bersama
    // lintas unit. Kalau satu laporan ditujukan ke lebih dari 1 unit
    // (misal MANAJEMEN & P3M), tiap unit punya baris boxing_ketidaksesuaian
    // dan rancangan_tindakan SENDIRI (dibedakan lewat id_boxing) — isian
    // Penyebab & Rencana Tindak Lanjut satu unit TIDAK PERNAH muncul/
    // menjadi nilai awal di unit lain. Masing-masing Kepala Unit mengisi
    // dan mengirim ke Ka P4M secara independen.

    // Kasih tau Ka P4M ada rancangan tindakan yang perlu diputuskan
    notifikasiUntukRole("ka_p4m", {
      judul: "Rancangan Tindakan Perlu Diputuskan",
      pesan: `Kepala unit ${kepala.unit} mengirim rancangan tindakan yang perlu keputusan Anda (ditindaklanjuti atau tidak).`,
      jenis: "rancangan_masuk",
      link: "/ka-p4m/proses-pengaduan",
    });

    return res.status(200).json({
      success: true,
      message:
        "Rancangan dikirim ke Ka P4M untuk keputusan ditindaklanjuti atau tidak.",
    });
  } catch (error) {
    console.error("Error submitRancangan:", error);
    return res
      .status(500)
      .json({ success: false, message: "Gagal menyimpan rancangan." });
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
        l.id_laporan, l.kode_laporan, l.jenis_laporan, l.deskripsi AS isi_laporan,
        r.id_rancangan, r.penyebab, r.deskripsi AS rencana_tindakan,
        r.status_review, r.aksi_masukan, r.updated_at AS tanggal_ditindaklanjuti,
        COALESCE(l.tanggal_kejadian, l.created_at) AS tanggal_laporan,
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
      [kepala.id_kepala],
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error getLaporanHasil:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data laporan hasil.",
    });
  }
}

// ✅ FIX (Riwayat menampilkan Total=0/Selesai=0/Persentase=0% walau
// laporan sudah pernah didistribusikan & ditangani Kepala Unit):
//
// SEBELUMNYA query ini pakai INNER JOIN ke rancangan_tindakan DAN
// pelaksanaan_tindakan sekaligus. Akibatnya laporan yang sudah masuk ke
// Kepala Unit dan sudah diisi Penyebab + Rencana, tapi BELUM sampai
// tahap pelaksanaan (misal: masih 'menunggu_keputusan_ka' — nunggu
// Ka P4M putuskan), belum punya baris di pelaksanaan_tindakan sama
// sekali, sehingga ikut TERBUANG oleh INNER JOIN dan tidak pernah
// muncul di Riwayat sama sekali. Kalau itu satu-satunya laporan yang
// pernah ditangani unit tsb (contoh kasus LAP-00002), hasilnya Total
// Laporan = 0, Selesai = 0, Persentase = 0% — padahal laporan itu sudah
// pernah didistribusikan dan sudah ditangani (Penyebab & Rencana sudah
// diisi Kepala Unit).
//
// FIX: "Riwayat" sekarang didefinisikan sesuai alur yang benar — SEMUA
// laporan yang PERNAH didistribusikan/ditangani oleh Kepala Unit ini,
// yaitu SEMUA baris boxing_ketidaksesuaian milik id_kepala ini, apa pun
// tahapnya sekarang (masih di Kepala Unit, di Staf P4M, atau sudah
// selesai). rancangan_tindakan & pelaksanaan_tindakan di-LEFT JOIN
// supaya baris yang belum sampai tahap itu tetap muncul (kolom terkait
// bernilai NULL, ditangani di frontend sebagai "—" / belum diisi).
// Filter "Selesai" tetap murni status_boxing = 'selesai' (lihat
// RiwayatTable.tsx) — laporan yang masih berjalan TIDAK dihitung selesai.
async function getRiwayat(req, res) {
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
        b.id_boxing, b.unit_tujuan AS nama_unit, b.status AS status_boxing,
        b.approval_staf, b.catatan_approval, b.created_at AS tanggal_distribusi,
        l.id_laporan, l.kode_laporan, l.jenis_laporan, l.deskripsi AS isi_laporan,
        COALESCE(l.tanggal_kejadian, l.created_at) AS tanggal_laporan,
        r.penyebab, r.deskripsi AS rencana_tindakan, r.status_review, r.aksi_masukan,
        p.id_pelaksanaan, p.deskripsi AS hasil_tindakan, p.lampiran AS lampiran_hasil,
        p.tanggal AS tanggal_pelaksanaan, p.created_at AS tanggal_kirim_hasil
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l ON l.id_laporan = b.id_laporan
      LEFT JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
      LEFT JOIN pelaksanaan_tindakan p ON p.id_boxing = b.id_boxing
      WHERE b.id_kepala = ?
      ORDER BY COALESCE(p.tanggal, b.created_at) DESC, b.id_boxing DESC`,
      [kepala.id_kepala],
    );

    // ✅ Statistik dihitung di backend juga (sumber kebenaran tunggal),
    // supaya frontend tidak perlu re-derive dan berisiko tidak sinkron.
    // total   = semua laporan yang pernah didistribusikan/ditangani unit ini
    // selesai = yang BENAR-BENAR sudah selesai (status_boxing = 'selesai')
    const total = rows.length;
    const selesai = rows.filter((d) => d.status_boxing === "selesai").length;
    const persentase = total > 0 ? Math.round((selesai / total) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: rows,
      unit: kepala.unit,
      stats: { total, selesai, persentase },
    });
  } catch (error) {
    console.error("Error getRiwayat:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data riwayat.",
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
              COALESCE(l.tanggal_kejadian, l.created_at) AS tanggal_laporan, r.updated_at AS tanggal_ditindaklanjuti
       FROM boxing_ketidaksesuaian b
       JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
       JOIN laporan_ketidaksesuaian l ON l.id_laporan = b.id_laporan
       WHERE b.id_boxing = ? AND b.id_kepala = ?
         AND r.status_review = 'ditindaklanjuti'
         AND (
           b.status = 'menunggu_pelaksanaan'
           OR (b.status = 'di_staff' AND b.approval_staf = 'ditolak')
         )`,
      [id_boxing, kepala.id_kepala],
    );

    if (boxingRows.length === 0) {
      return res.status(403).json({
        success: false,
        message:
          "Laporan tidak ditemukan atau belum disetujui untuk ditindaklanjuti oleh Ka P4M.",
      });
    }

    const id_laporan = boxingRows[0].id_laporan;
    // ✅ FIX (permintaan user): sebelumnya tanggal pelaksanaan TIDAK BOLEH
    // lebih awal dari tanggal laporan/tanggal Ka P4M menindaklanjuti —
    // di lapangan ini menyulitkan Kepala Unit karena pekerjaan/perbaikan
    // fisiknya kadang sudah dilakukan lebih dulu sebelum pencatatan resmi
    // di sistem selesai (mis. instruksi lisan lebih dulu). Sekarang
    // Kepala Unit bebas memilih tanggal pelaksanaan kapan pun, TERMASUK
    // tanggal sebelum tanggal laporan/keputusan Ka P4M — satu-satunya
    // batasan yang tersisa adalah tidak boleh tanggal di MASA DEPAN
    // (lebih besar dari hari ini), supaya tetap masuk akal sebagai
    // catatan pelaksanaan yang sudah benar-benar terjadi.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tanggalInput = new Date(tanggal);
    tanggalInput.setHours(0, 0, 0, 0);
    if (isNaN(tanggalInput.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Tanggal pelaksanaan tidak valid.",
      });
    }
    if (tanggalInput > today) {
      return res.status(400).json({
        success: false,
        message: "Tanggal pelaksanaan tidak boleh di masa depan.",
      });
    }

    const [existingPelaksanaan] = await pool.query(
      `SELECT id_pelaksanaan FROM pelaksanaan_tindakan WHERE id_boxing = ?`,
      [id_boxing],
    );

    if (existingPelaksanaan.length > 0) {
      await pool.query(
        `UPDATE pelaksanaan_tindakan
         SET deskripsi = ?, tanggal = ?, lampiran = ?, updated_at = NOW()
         WHERE id_boxing = ?`,
        [deskripsi, tanggal, lampiran, id_boxing],
      );
    } else {
      await pool.query(
        `INSERT INTO pelaksanaan_tindakan (id_boxing, id_kepala, deskripsi, lampiran, tanggal)
         VALUES (?, ?, ?, ?, ?)`,
        [id_boxing, kepala.id_kepala, deskripsi, lampiran, tanggal],
      );
    }

    // ✅ FIX: reset approval_staf balik ke 'menunggu' setiap kali Kepala
    // Unit submit ulang (penting untuk kasus revisi setelah ditolak),
    // supaya Staf P4M tahu ini hasil BARU yang perlu di-review lagi.
    await pool.query(
      `UPDATE boxing_ketidaksesuaian SET status = 'di_staff', approval_staf = 'menunggu' WHERE id_boxing = ?`,
      [id_boxing],
    );
    await pool.query(
      `UPDATE laporan_ketidaksesuaian SET status = 'diproses' WHERE id_laporan = ?`,
      [id_laporan],
    );

    return res.status(200).json({
      success: true,
      message:
        "Hasil tindak lanjut dikirim ke Staf P4M untuk penilaian selesai atau belum.",
    });
  } catch (error) {
    console.error("Error submitPelaksanaan:", error);
    return res
      .status(500)
      .json({ success: false, message: "Gagal menyimpan pelaksanaan." });
  }
}

module.exports = {
  getLaporanMasuk,
  submitRancangan,
  getLaporanHasil,
  getRiwayat,
  submitPelaksanaan,
};