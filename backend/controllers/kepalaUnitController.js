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

// ═════════════════════════════════════════════════════════════════════════════
// TAB "KETIDAKSESUAIAN MASUK"
// ═════════════════════════════════════════════════════════════════════════════

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
        r.tanggal_rencana,
        r.status_review, r.aksi_masukan, r.catatan AS catatan_review
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l ON l.id_laporan = b.id_laporan
      LEFT JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
      WHERE b.id_kepala = ?
        AND b.status NOT IN ('selesai')
        AND (
          r.id_rancangan IS NULL
          OR r.status_review = 'menunggu_keputusan_ka'
          OR (b.status = 'di_staff' AND b.approval_staf = 'ditolak')
        )
      ORDER BY b.created_at DESC`,
      [kepala.id_kepala],
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error getLaporanMasuk:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data laporan masuk.",
    });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SUBMIT RANCANGAN (kirim ke Ka P4M)
// ✅ UPDATE: sekarang ambil rencana dari tabel `rencana_tindak_lanjut`
// (multi-item) lalu gabungkan jadi 1 teks untuk backward-compat kolom
// `rancangan_tindakan.deskripsi` yang masih dipakai query lama.
// ═════════════════════════════════════════════════════════════════════════════

async function submitRancangan(req, res) {
  const { id_boxing, penyebab } = req.body;

  if (!id_boxing || !penyebab) {
    return res.status(400).json({
      success: false,
      message: "id_boxing dan penyebab wajib diisi.",
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

    // Pastikan laporan ini milik unit ini
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

    // ✅ Ambil semua rencana dari tabel rencana_tindak_lanjut
    const [rencanaRows] = await pool.query(
      `SELECT teks, tanggal FROM rencana_tindak_lanjut
       WHERE id_boxing = ? ORDER BY urutan ASC, id ASC`,
      [id_boxing],
    );

    if (rencanaRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Minimal 1 rencana tindak lanjut harus ditambahkan. Klik '📝 Kelola Rencana' dulu.",
      });
    }

    // ✅ Gabungkan jadi 1 teks: "1. Teks A (20/09/2026); 2. Teks B (25/09/2026)"
    const gabunganTeks = rencanaRows
      .map((r, i) => {
        const tgl = new Date(r.tanggal).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        return `Rencana ${i + 1}: ${r.teks} (${tgl})`;
      })
      .join("\n");

    // Tanggal rencana = tanggal paling akhir dari semua item
    const tanggalTerakhir = rencanaRows.reduce((max, r) => {
      const t = new Date(r.tanggal);
      return t > max ? t : max;
    }, new Date(rencanaRows[0].tanggal));
    const tanggalTerakhirStr = tanggalTerakhir.toISOString().split("T")[0];

    // Cek apakah rancangan sudah ada
    const [existing] = await pool.query(
      `SELECT id_rancangan, status_review FROM rancangan_tindakan WHERE id_boxing = ?`,
      [id_boxing],
    );

    if (existing.length > 0) {
      // Hanya boleh update kalau status_review masih 'menunggu_keputusan_ka'
      if (existing[0].status_review !== "menunggu_keputusan_ka") {
        return res.status(400).json({
          success: false,
          message:
            "Rancangan sudah diputuskan Ka P4M dan tidak bisa diubah dari sini.",
        });
      }
      await pool.query(
        `UPDATE rancangan_tindakan
         SET penyebab = ?, deskripsi = ?, tanggal_rencana = ?, updated_at = NOW()
         WHERE id_boxing = ?`,
        [penyebab, gabunganTeks, tanggalTerakhirStr, id_boxing],
      );
    } else {
      await pool.query(
        `INSERT INTO rancangan_tindakan (id_boxing, penyebab, deskripsi, tanggal_rencana, status_review)
         VALUES (?, ?, ?, ?, 'menunggu_keputusan_ka')`,
        [id_boxing, penyebab, gabunganTeks, tanggalTerakhirStr],
      );
    }

    await pool.query(
      `UPDATE boxing_ketidaksesuaian SET status = 'diproses' WHERE id_boxing = ?`,
      [id_boxing],
    );

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

// ═════════════════════════════════════════════════════════════════════════════
// TAB "LAPORAN HASIL"
// ═════════════════════════════════════════════════════════════════════════════

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
        r.tanggal_rencana,
        r.status_review, r.aksi_masukan, r.updated_at AS tanggal_ditindaklanjuti,
        COALESCE(l.tanggal_kejadian, l.created_at) AS tanggal_laporan,
        p.id_pelaksanaan, p.deskripsi AS hasil_tindakan,
        p.lampiran AS lampiran_hasil, p.tanggal AS tanggal_pelaksanaan
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l ON l.id_laporan = b.id_laporan
      JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
      LEFT JOIN pelaksanaan_tindakan p ON p.id_boxing = b.id_boxing
      WHERE b.id_kepala = ?
        -- ✅ FIX (permintaan user): tab "Laporan Hasil" HANYA untuk laporan
        -- yang benar-benar sedang/pernah diminta mengisi hasil tindak lanjut
        -- (Ka P4M memutuskan 'ditindaklanjuti' dan menunggu pelaksanaan unit).
        -- Sebelumnya ada tambahan "OR (b.status = 'di_staff' AND
        -- b.approval_staf = 'ditolak')" yang membuat laporan yang DITOLAK
        -- Staf P4M ikut nongol di sini — termasuk laporan "Sesuai / tidak
        -- ditindaklanjuti" yang MEMANG TIDAK PERNAH punya laporan hasil sama
        -- sekali. Laporan yang ditolak Staf P4M sekarang HANYA muncul di tab
        -- "Ketidaksesuaian Masuk" → "Keputusan Staf" (lihat StafDecisionTable
        -- & getLaporanMasuk) untuk direvisi Penyebab & Rencana lalu dikirim
        -- ulang ke Ka P4M. Kalau Ka P4M memutuskan 'ditindaklanjuti' lagi,
        -- laporan itu baru akan muncul lagi di sini secara alami lewat
        -- kondisi di bawah (status_review='ditindaklanjuti' AND
        -- status_boxing='menunggu_pelaksanaan').
        AND r.status_review = 'ditindaklanjuti'
        AND b.status = 'menunggu_pelaksanaan'
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

    const [boxingRows] = await pool.query(
      `SELECT b.id_boxing, b.id_laporan, b.status AS status_boxing, b.approval_staf,
              COALESCE(l.tanggal_kejadian, l.created_at) AS tanggal_laporan, r.updated_at AS tanggal_ditindaklanjuti
       FROM boxing_ketidaksesuaian b
       JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
       JOIN laporan_ketidaksesuaian l ON l.id_laporan = b.id_laporan
       WHERE b.id_boxing = ? AND b.id_kepala = ?
         AND r.status_review = 'ditindaklanjuti'
         -- ✅ FIX (sinkron dengan getLaporanHasil): cabang
         -- "OR (b.status = 'di_staff' AND b.approval_staf = 'ditolak')"
         -- yang lama sudah tidak pernah tercapai — begitu Staf P4M
         -- menolak, setApprovalStaf mereset status_review balik ke
         -- 'menunggu_keputusan_ka' (bukan tetap 'ditindaklanjuti'), jadi
         -- laporan yang ditolak justru wajib lewat revisi Penyebab &
         -- Rencana di tab "Keputusan Staf" dulu, baru bisa isi Laporan
         -- Hasil baru lewat jalur normal di bawah ini.
         AND b.status = 'menunggu_pelaksanaan'`,
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

// ═════════════════════════════════════════════════════════════════════════════
// TAB "RIWAYAT"
// ═════════════════════════════════════════════════════════════════════════════

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
        r.penyebab, r.deskripsi AS rencana_tindakan, r.tanggal_rencana,
        r.status_review, r.aksi_masukan,
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

// ═════════════════════════════════════════════════════════════════════════════
// ✅ FITUR BARU: CRUD Rencana Tindak Lanjut (multi-item per laporan)
//
// Sebelumnya: 1 laporan = 1 teks "rencana_tindakan" + 1 "tanggal_rencana"
// Sekarang:   1 laporan = BANYAK rencana, masing-masing punya teks + tanggal
// Disimpan di tabel baru: rencana_tindak_lanjut (FK ke id_boxing)
//
// Alur:
//   1. Kepala Unit buka modal "Kelola Rencana" di frontend
//   2. Tambah/edit/hapus item rencana → tersimpan via endpoint ini
//   3. Klik "Kirim" di tabel utama → submitRancangan gabungkan semua
//      rencana jadi 1 teks panjang di rancangan_tindakan.deskripsi
//      (backward compat) + update status_review
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/kepala-unit/rencana/:id_boxing
async function getRencana(req, res) {
  const { id_boxing } = req.params;
  try {
    const kepala = await getKepalaInfo(req);
    if (!kepala) {
      return res.status(403).json({
        success: false,
        message: "Data kepala unit tidak ditemukan.",
      });
    }

    const [boxingRows] = await pool.query(
      `SELECT id_boxing FROM boxing_ketidaksesuaian 
       WHERE id_boxing = ? AND id_kepala = ?`,
      [id_boxing, kepala.id_kepala],
    );
    if (boxingRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Laporan ini tidak ditujukan ke unit Anda.",
      });
    }

    const [rows] = await pool.query(
      `SELECT id, id_boxing, teks, tanggal, urutan, 
              created_at, updated_at
       FROM rencana_tindak_lanjut
       WHERE id_boxing = ?
       ORDER BY urutan ASC, id ASC`,
      [id_boxing],
    );

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error getRencana:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data rencana.",
    });
  }
}

// POST /api/kepala-unit/rencana
// Body: { id_boxing, teks, tanggal }
async function addRencana(req, res) {
  const { id_boxing, teks, tanggal } = req.body;

  if (!id_boxing || !teks || !tanggal) {
    return res.status(400).json({
      success: false,
      message: "id_boxing, teks, dan tanggal wajib diisi.",
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tgl = new Date(tanggal);
  tgl.setHours(0, 0, 0, 0);
  if (isNaN(tgl.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Tanggal tidak valid.",
    });
  }
  if (tgl < today) {
    return res.status(400).json({
      success: false,
      message: "Tanggal rencana tidak boleh tanggal yang sudah lewat.",
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
      `SELECT id_boxing FROM boxing_ketidaksesuaian 
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
      `SELECT status_review FROM rancangan_tindakan WHERE id_boxing = ?`,
      [id_boxing],
    );
    if (existing.length > 0 && 
        existing[0].status_review !== "menunggu_keputusan_ka") {
      return res.status(400).json({
        success: false,
        message: "Rancangan sudah diputuskan Ka P4M, tidak bisa diubah lagi.",
      });
    }

    const [maxUrut] = await pool.query(
      `SELECT COALESCE(MAX(urutan), -1) + 1 AS next_urutan 
       FROM rencana_tindak_lanjut WHERE id_boxing = ?`,
      [id_boxing],
    );
    const urutan = maxUrut[0].next_urutan;

    const [result] = await pool.query(
      `INSERT INTO rencana_tindak_lanjut (id_boxing, teks, tanggal, urutan)
       VALUES (?, ?, ?, ?)`,
      [id_boxing, teks.trim(), tanggal, urutan],
    );

    return res.status(200).json({
      success: true,
      message: "Rencana berhasil ditambahkan.",
      data: { id: result.insertId, id_boxing, teks, tanggal, urutan },
    });
  } catch (error) {
    console.error("Error addRencana:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menambah rencana.",
    });
  }
}

// PUT /api/kepala-unit/rencana/:id
// Body: { teks, tanggal }
async function updateRencana(req, res) {
  const { id } = req.params;
  const { teks, tanggal } = req.body;

  if (!teks || !tanggal) {
    return res.status(400).json({
      success: false,
      message: "teks dan tanggal wajib diisi.",
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tgl = new Date(tanggal);
  tgl.setHours(0, 0, 0, 0);
  if (isNaN(tgl.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Tanggal tidak valid.",
    });
  }
  if (tgl < today) {
    return res.status(400).json({
      success: false,
      message: "Tanggal rencana tidak boleh tanggal yang sudah lewat.",
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

    const [rows] = await pool.query(
      `SELECT r.id, r.id_boxing, ra.status_review
       FROM rencana_tindak_lanjut r
       JOIN boxing_ketidaksesuaian b ON b.id_boxing = r.id_boxing
       LEFT JOIN rancangan_tindakan ra ON ra.id_boxing = r.id_boxing
       WHERE r.id = ? AND b.id_kepala = ?`,
      [id, kepala.id_kepala],
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Rencana tidak ditemukan.",
      });
    }
    if (rows[0].status_review && 
        rows[0].status_review !== "menunggu_keputusan_ka") {
      return res.status(400).json({
        success: false,
        message: "Rancangan sudah diputuskan Ka P4M, tidak bisa diubah lagi.",
      });
    }

    await pool.query(
      `UPDATE rencana_tindak_lanjut 
       SET teks = ?, tanggal = ?, updated_at = NOW()
       WHERE id = ?`,
      [teks.trim(), tanggal, id],
    );

    return res.status(200).json({
      success: true,
      message: "Rencana berhasil diperbarui.",
    });
  } catch (error) {
    console.error("Error updateRencana:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui rencana.",
    });
  }
}

// DELETE /api/kepala-unit/rencana/:id
async function deleteRencana(req, res) {
  const { id } = req.params;
  try {
    const kepala = await getKepalaInfo(req);
    if (!kepala) {
      return res.status(403).json({
        success: false,
        message: "Data kepala unit tidak ditemukan.",
      });
    }

    const [rows] = await pool.query(
      `SELECT r.id, ra.status_review
       FROM rencana_tindak_lanjut r
       JOIN boxing_ketidaksesuaian b ON b.id_boxing = r.id_boxing
       LEFT JOIN rancangan_tindakan ra ON ra.id_boxing = r.id_boxing
       WHERE r.id = ? AND b.id_kepala = ?`,
      [id, kepala.id_kepala],
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Rencana tidak ditemukan.",
      });
    }
    if (rows[0].status_review && 
        rows[0].status_review !== "menunggu_keputusan_ka") {
      return res.status(400).json({
        success: false,
        message: "Rancangan sudah diputuskan Ka P4M, tidak bisa dihapus.",
      });
    }

    await pool.query(
      `DELETE FROM rencana_tindak_lanjut WHERE id = ?`,
      [id],
    );

    return res.status(200).json({
      success: true,
      message: "Rencana berhasil dihapus.",
    });
  } catch (error) {
    console.error("Error deleteRencana:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus rencana.",
    });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ✅ EXPORT — HARUS DI PALING BAWAH, setelah SEMUA fungsi didefinisikan.
// Sebelumnya module.exports ada di tengah file (setelah submitPelaksanaan),
// jadi 4 fungsi CRUD rencana di bawahnya TIDAK ikut ke-export → bikin
// error "Route.get() requires a callback function but got [object Undefined]"
// di kepalaUnitRoutes.js.
// ═════════════════════════════════════════════════════════════════════════════
module.exports = {
  getLaporanMasuk,
  submitRancangan,
  getLaporanHasil,
  getRiwayat,
  submitPelaksanaan,
  // ✅ FITUR BARU: CRUD rencana tindak lanjut (multi-item)
  getRencana,
  addRencana,
  updateRencana,
  deleteRencana,
};