// FILE: backend/controllers/stafController.js
// Menangani semua fitur Staf P4M + fungsi reviewRancangan
// yang juga dipakai oleh Ka P4M lewat endpoint /staf/review-rancangan
//
// Daftar fungsi:
//   1. getLaporanMasuk      → lihat laporan masuk (status: menunggu)
//   2. getKepalaUnit        → daftar kepala unit untuk dropdown
//   3. distribusiLaporan    → kirim laporan ke kepala unit (boxing)
//   4. getProsesMonitor     → lihat semua proses + rancangan + pelaksanaan
//   5. setKeputusanBoxing   → Staf P4M putuskan selesai/belum/lanjut
//   6. inputHasilPemantauan → Staf P4M input hasil pemantauan lapangan
//   7. getRekapitulasi      → ringkasan semua laporan dari awal sampai selesai
//   8. setApprovalStaf      → setujui/tolak hasil tindak lanjut unit.
//                              ✅ Sekarang di-mount di /api/ka-p4m/approval-hasil
//                              (kaP4MRoutes.js), BUKAN lagi di route staf.
//                              Nama fungsi dibiarkan "setApprovalStaf" supaya
//                              histori/diff minimal, tapi pemilik keputusannya
//                              sekarang Ka P4M. Staf P4M hanya read-only lewat
//                              getProsesMonitor.
//
// ════════════════════════════════════════════════════════════════════════
// CATATAN PERBAIKAN (sesi ini) — alur "approve → selesai" & "reopen penuh"
// ════════════════════════════════════════════════════════════════════════
//
// BUG #1 — [setApprovalStaf] "Disetujui" tidak otomatis "Selesai"
//   Sebelumnya fungsi ini HANYA mengubah kolom approval_staf, dan TIDAK
//   PERNAH menyentuh boxing.status. Akibatnya laporan yang sudah di-acc
//   Staf P4M (approval_staf='diterima') tetap nyangkut di status_boxing
//   ='di_staff', sehingga TIDAK PERNAH muncul di tab Rekapitulasi sebagai
//   "Selesai" — terus terlihat sebagai "Dipantau" walau sudah di-acc.
//   FIX: begitu approval='diterima', langsung set status='selesai' juga
//   (dan panggil syncStatusLaporan supaya laporan_ketidaksesuaian ikut
//   ter-update). Kalau approval='ditolak', laporan TETAP di status
//   'di_staff' tapi dengan approval_staf='ditolak' — supaya Kepala Unit
//   bisa melihatnya di tab "Laporan Hasil" sebagai revisi (lihat juga fix
//   di kepalaUnitController.js untuk getLaporanHasil).
//
// BUG #2 — [setKeputusanBoxing aksi='lanjut'] reopen tidak mereset
//   rancangan_tindakan. Sebelumnya tombol "buka kembali" cuma mengubah
//   boxing.status jadi 'menunggu_pelaksanaan', TANPA mereset
//   rancangan_tindakan.status_review balik ke 'menunggu_keputusan_ka'.
//   Akibatnya kombinasi status jadi rusak: boxing bilang "menunggu unit
//   isi pelaksanaan baru" tapi rancangan masih bilang "ditindaklanjuti"/
//   "tidak_ditindaklanjuti" dari siklus SEBELUMNYA — sehingga laporan
//   bisa hilang dari kedua tab Kepala Unit sekaligus (lihat investigasi
//   data riil LAP-00002 sebelumnya).
//   FIX: aksi 'lanjut' SEKARANG benar-benar mereset rancangan_tindakan
//   (status_review → 'menunggu_keputusan_ka', aksi_masukan → NULL) DAN
//   menghapus pelaksanaan_tindakan yang lama, supaya laporan benar-benar
//   "lahir ulang" dari awal di tab "Ketidaksesuaian Masuk" Kepala Unit —
//   sesuai alur yang diminta: Kepala Unit isi rancangan baru → Ka P4M
//   putuskan lagi → Kepala Unit isi pelaksanaan baru → balik ke Staf P4M.
//
// BUG #3 — [setApprovalStaf, approval='ditolak'] penyebab & rencana
//   ikut dikosongkan (di-NULL-kan) saat reset.
//   Sebelumnya, waktu Staf P4M menolak hasil tindak lanjut, backend
//   ikut menghapus ISI penyebab & rencana tindak lanjut yang sudah
//   ditulis Kepala Unit sebelumnya — padahal itu belum tentu salah,
//   yang salah biasanya cuma HASIL PELAKSANAANNYA (buktinya, laporan
//   hasilnya). Ini bikin Kepala Unit harus ngetik ulang semuanya dari
//   nol walau penyebab/rencananya sebenarnya masih valid.
//   FIX: saat "ditolak", penyebab & rencana yang SUDAH ADA dibiarkan
//   apa adanya (tidak di-NULL-kan) — laporan cuma "dibuka lagi" lewat
//   status_review → 'menunggu_keputusan_ka' supaya kotaknya jadi bisa
//   diedit lagi. Kepala Unit tinggal koreksi kalau memang ada yang
//   salah, atau kirim ulang apa adanya kalau penyebab/rencananya sudah
//   benar. pelaksanaan_tindakan (hasil unit) tetap dihapus, karena itu
//   memang bagian yang mau direvisi.

const { pool } = require("../config/db");
const { notifikasiUntukPengguna } = require("../utils/notifikasi");
const { UNITS_UMUM } = require("../constants/unitsUmum");

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
       WHERE unit IN (?)
       ORDER BY unit ASC`,
      [UNITS_UMUM]
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

    const { ALL_UNITS } = require("../constants/unitsUmum");
    const unitTidakValid = unitArray.filter((u) => !ALL_UNITS.includes(u));
    if (unitTidakValid.length > 0) {
      conn.release();
      return res.status(400).json({
        success: false,
        message: `Unit tidak valid: ${unitTidakValid.join(", ")}`,
      });
    }

    await conn.beginTransaction();

    const insertedIds = [];
    const kepalaUntukNotif = []; // { id_pengguna, unit } — dinotif setelah commit sukses
    for (const unit of unitArray) {
      const [kepalaRows] = await conn.query(
        `SELECT id_kepala, id_pengguna, nama FROM kepala_unit WHERE unit = ? LIMIT 1`,
        [unit]
      );

      if (kepalaRows.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          success: false,
          message: `Kepala unit untuk "${unit}" belum terdaftar. Jalankan seed akun kepala unit terlebih dahulu.`,
        });
      }

      const { id_kepala, id_pengguna: id_pengguna_kepala } = kepalaRows[0];
      kepalaUntukNotif.push({ id_pengguna: id_pengguna_kepala, unit });

      const [result] = await conn.query(
        `INSERT INTO boxing_ketidaksesuaian
          (id_laporan, id_staf, id_kepala, unit_tujuan, id_standar, status)
         VALUES (?, ?, ?, ?, ?, 'terdistribusi')`,
        [id_laporan, id_staf, id_kepala, unit, id_standar || null]
      );
      insertedIds.push(result.insertId);
    }

    await conn.query(
      `UPDATE laporan_ketidaksesuaian SET status = 'diproses' WHERE id_laporan = ?`,
      [id_laporan]
    );

    await conn.commit();

    // Kasih tau tiap kepala unit terkait ada laporan baru masuk ke unitnya
    for (const k of kepalaUntukNotif) {
      notifikasiUntukPengguna(k.id_pengguna, {
        judul: "Laporan Baru untuk Unit Anda",
        pesan: `Ada laporan ketidaksesuaian baru yang didistribusikan ke unit ${k.unit}. Mohon segera ditindaklanjuti.`,
        jenis: "distribusi_unit",
        link: "/kepala-unit/ketidaksesuaian-masuk",
      });
    }

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
        b.approval_staf,
        b.catatan_approval,
        b.updated_at          AS tanggal_keputusan_ka,

        r.id_rancangan,
        r.penyebab,
        r.deskripsi           AS rencana_tindakan,
        r.status_review,
        r.aksi_masukan,
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
// 5. KEPUTUSAN STAF P4M per boxing: selesai | belum | lanjut
// ============================================================
async function syncStatusLaporan(id_laporan) {
  const [pending] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM boxing_ketidaksesuaian
     WHERE id_laporan = ? AND status != 'selesai'`,
    [id_laporan]
  );
  const semuaSelesai = Number(pending[0].cnt) === 0;
  await pool.query(
    `UPDATE laporan_ketidaksesuaian SET status = ? WHERE id_laporan = ?`,
    [semuaSelesai ? "selesai" : "diproses", id_laporan]
  );
}

async function setKeputusanBoxing(req, res) {
  const { id_boxing, keputusan } = req.body;

  let aksi = keputusan;
  const valid = ["selesai", "belum", "lanjut", "ditindak_lanjut"];
  if (!id_boxing || !valid.includes(aksi)) {
    return res.status(400).json({
      success: false,
      message: "id_boxing dan keputusan (selesai|belum|ditindak_lanjut) wajib diisi.",
    });
  }
  if (aksi === "ditindak_lanjut") aksi = "lanjut";

  try {
    const [rows] = await pool.query(
      `SELECT b.id_boxing, b.id_laporan, b.status AS status_boxing, b.approval_staf,
              r.status_review, r.id_rancangan
       FROM boxing_ketidaksesuaian b
       LEFT JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
       WHERE b.id_boxing = ?`,
      [id_boxing]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Data tidak ditemukan." });
    }

    const row = rows[0];

    if (aksi === "selesai") {
      if (row.status_boxing !== "di_staff") {
        return res.status(400).json({
          success: false,
          message: "Hanya laporan yang sudah di Staf P4M yang bisa ditandai selesai.",
        });
      }
      await pool.query(
        `UPDATE boxing_ketidaksesuaian SET status = 'selesai' WHERE id_boxing = ?`,
        [id_boxing]
      );
      await syncStatusLaporan(row.id_laporan);
      return res.status(200).json({
        success: true,
        message: "Laporan unit ini selesai dan masuk rekapitulasi.",
      });
    }

    if (aksi === "belum") {
      if (row.status_boxing !== "di_staff" || row.status_review !== "ditindaklanjuti") {
        return res.status(400).json({
          success: false,
          message: "Opsi 'belum' hanya untuk laporan ditindaklanjuti yang sudah ada hasil unit.",
        });
      }
      await pool.query(
        `UPDATE boxing_ketidaksesuaian SET status = 'menunggu_pelaksanaan' WHERE id_boxing = ?`,
        [id_boxing]
      );
      await pool.query(
        `UPDATE laporan_ketidaksesuaian SET status = 'diproses' WHERE id_laporan = ?`,
        [row.id_laporan]
      );
      return res.status(200).json({
        success: true,
        message: "Laporan dikembalikan ke Kepala Unit untuk perbaikan hasil tindak lanjut.",
      });
    }

    // ════════════════════════════════════════════════════════════
    // aksi === "lanjut"  (dipanggil juga untuk "ditindak_lanjut")
    // ✅ FIX BUG #2: reopen PENUH dari awal — bukan cuma ubah
    // status_boxing, tapi juga reset rancangan_tindakan dan hapus
    // pelaksanaan_tindakan lama, supaya Kepala Unit benar-benar
    // mulai dari "Ketidaksesuaian Masuk" lagi (isi rancangan baru),
    // bukan langsung lompat ke "Laporan Hasil" dengan rancangan basi.
    //
    // ✅ FIX BUG #3 (sesi ini): validasi bisaLanjut SEBELUMNYA hanya
    // mengizinkan reopen untuk laporan yang sudah 'selesai' ATAU
    // ditolak KA P4M (status_review='tidak_ditindaklanjuti'). Tapi
    // sejak tombol ↻ sekarang SELALU tampil bersamaan dengan ✓/✗ di
    // kolom "Keputusan Staf" (ProcessMonitorTable.tsx), staf bisa klik
    // ↻ untuk laporan yang DITOLAK STAF SENDIRI (approval_staf=
    // 'ditolak', status_boxing tetap 'di_staff') — kasus ini SEBELUMNYA
    // tidak diakomodasi sama sekali, sehingga backend selalu menolak
    // dengan pesan "Opsi 'lanjut' hanya untuk laporan selesai atau yang
    // ditolak Ka P4M." walau row itu sudah jelas-jelas berstatus
    // ditolak (oleh Staf, bukan Ka P4M). Sekarang ditambahkan kondisi
    // ketiga: status_boxing='di_staff' DAN approval_staf='ditolak'.
    // ════════════════════════════════════════════════════════════
    const bisaLanjut =
      row.status_boxing === "selesai" ||
      (row.status_boxing === "di_staff" && row.status_review === "tidak_ditindaklanjuti") ||
      (row.status_boxing === "di_staff" && row.approval_staf === "ditolak");

    if (!bisaLanjut) {
      return res.status(400).json({
        success: false,
        message: "Opsi 'lanjut' hanya untuk laporan selesai, ditolak Ka P4M, atau ditolak Staf P4M.",
      });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1) Boxing kembali ke titik PALING AWAL siklus Kepala Unit:
      //    'terdistribusi' — supaya muncul di tab "Ketidaksesuaian Masuk",
      //    bukan 'menunggu_pelaksanaan' (yang justru muncul di "Laporan Hasil").
      await conn.query(
        `UPDATE boxing_ketidaksesuaian
         SET status = 'terdistribusi', approval_staf = 'menunggu'
         WHERE id_boxing = ?`,
        [id_boxing]
      );

      // 2) Reset rancangan_tindakan supaya Kepala Unit isi ulang dari nol.
      //    Sebelumnya BUG: baris ini tidak pernah dijalankan, sehingga
      //    status_review siklus LAMA (ditindaklanjuti/tidak_ditindaklanjuti)
      //    tetap nyangkut dan membuat laporan tidak konsisten di kedua sisi.
      if (row.id_rancangan) {
        await conn.query(
          `UPDATE rancangan_tindakan
           SET status_review = 'menunggu_keputusan_ka', aksi_masukan = NULL, updated_at = NOW()
           WHERE id_boxing = ?`,
          [id_boxing]
        );
      }

      // 3) Hapus pelaksanaan_tindakan LAMA — siklus baru butuh pelaksanaan baru.
      await conn.query(
        `DELETE FROM pelaksanaan_tindakan WHERE id_boxing = ?`,
        [id_boxing]
      );

      // 4) Laporan induk balik ke "diproses" (sedang berjalan lagi)
      await conn.query(
        `UPDATE laporan_ketidaksesuaian SET status = 'diproses' WHERE id_laporan = ?`,
        [row.id_laporan]
      );

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    return res.status(200).json({
      success: true,
      message: "Laporan dibuka kembali dari awal — Kepala Unit perlu mengisi rancangan baru.",
    });
  } catch (error) {
    console.error("Error setKeputusanBoxing:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan keputusan.",
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
// 7. GET REKAPITULASI — hanya boxing yang sudah selesai (Staf)
//    Ringkasan semua laporan dari awal sampai selesai.
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

        b.id_boxing,
        b.unit_tujuan         AS nama_unit,
        b.status              AS status_boxing,
        b.approval_staf,
        b.catatan_approval,
        b.updated_at          AS tanggal_keputusan_ka,

        r.penyebab,
        r.deskripsi           AS rencana_tindakan,
        r.status_review,

        p.deskripsi           AS hasil_tindakan,
        p.lampiran            AS lampiran_hasil,
        p.tanggal             AS tanggal_pelaksanaan
      FROM laporan_ketidaksesuaian l
      JOIN boxing_ketidaksesuaian b        ON b.id_laporan = l.id_laporan
      LEFT JOIN rancangan_tindakan r       ON r.id_boxing  = b.id_boxing
      LEFT JOIN pelaksanaan_tindakan p     ON p.id_boxing  = b.id_boxing
      WHERE b.status = 'selesai'
      ORDER BY l.created_at DESC`
    );
    // ✅ FIX kecil terkait: sebelumnya WHERE klausanya
    // `b.status IN ('selesai', 'di_staff')` — artinya laporan yang BELUM
    // selesai (masih nunggu approval Staf) ikut nyangkut dianggap data
    // "rekap". Sekarang HANYA yang benar-benar 'selesai' yang dianggap
    // bagian rekapitulasi final; sisanya (di_staff/dst) tetap dihitung
    // sebagai "dipantau" oleh RecapitulationTable.tsx via getProsesMonitor.

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
// 7b. UPLOAD ARSIP REKAP — POST /api/staf/rekap/arsip/upload
//     Staf mengupload file Excel data tahun lalu (s/d 10 tahun
//     ke belakang). Isi file dibaca lalu disimpan ke tabel
//     arsip_rekapitulasi supaya bisa ikut ditampilkan rapi per
//     tahun saat export Excel dibuat.
// ============================================================
const KOLOM_ALIAS = {
  kode:         ["kode laporan", "kode"],
  jenis:        ["jenis laporan", "jenis"],
  tglMasuk:     ["tgl masuk", "tanggal masuk"],
  uraian:       ["uraian ketidaksesuaian", "uraian"],
  unit:         ["unit"],
  penyebab:     ["penyebab"],
  rencana:      ["rencana tindakan", "rencana"],
  hasil:        ["hasil tindak lanjut", "hasil"],
  tglPelaks:    ["tgl pelaksanaan", "tanggal pelaksanaan"],
  statusReview: ["status review"],
  statusBoxing: ["status proses", "status boxing"],
};

function cariBarisHeader(sheet) {
  const batasBaris = Math.min(sheet.rowCount, 10);
  for (let r = 1; r <= batasBaris; r++) {
    const row = sheet.getRow(r);
    const petaKolom = {};
    let jumlahCocok = 0;

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const nilai = cell.value;
      if (nilai == null) return;
      const teks = String(typeof nilai === "object" ? (nilai.text ?? nilai.result ?? "") : nilai)
        .trim()
        .toLowerCase();
      if (!teks) return;
      for (const [key, alias] of Object.entries(KOLOM_ALIAS)) {
        if (alias.includes(teks) && petaKolom[key] === undefined) {
          petaKolom[key] = colNumber;
          jumlahCocok++;
        }
      }
    });

    // Minimal 4 kolom penting terbaca supaya baris ini dianggap header valid
    if (jumlahCocok >= 4) {
      return { headerRowNum: r, petaKolom };
    }
  }
  return null;
}

function ambilNilaiSel(row, colNumber) {
  if (!colNumber) return null;
  const cell = row.getCell(colNumber);
  const nilai = cell?.value;
  if (nilai == null) return null;
  if (typeof nilai === "object") {
    if (nilai.text) return String(nilai.text).trim() || null;
    if (nilai.result != null) return String(nilai.result).trim() || null;
    if (nilai instanceof Date) return nilai.toISOString().slice(0, 10);
    return null;
  }
  const teks = String(nilai).trim();
  return teks === "" ? null : teks;
}

async function uploadArsipRekap(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File Excel wajib diunggah.",
      });
    }

    const tahun = parseInt(req.body.tahun, 10);
    const tahunSekarang = new Date().getFullYear();
    if (!tahun || tahun < tahunSekarang - 10 || tahun > tahunSekarang) {
      return res.status(400).json({
        success: false,
        message: `Tahun tidak valid. Pilih tahun antara ${tahunSekarang - 10} sampai ${tahunSekarang}.`,
      });
    }

    const ExcelJS  = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    // ✅ DIPERBAIKI: sebelumnya kode ini asal ambil "sheet pertama yang
    // bukan Ringkasan", sehingga kalau file yang diupload adalah hasil
    // export TUNTAS (yang punya banyak sheet: Ringkasan, Laporan Masih
    // Dipantau, Laporan Selesai, Arsip ...), yang kebaca malah sheet
    // "Laporan Masih Dipantau" (karena urutannya duluan), bukan sheet
    // "Laporan Selesai" yang seharusnya diarsipkan.
    //
    // Sekarang urutan prioritasnya:
    //   1. Sheet yang namanya mengandung "selesai"      → paling diutamakan
    //   2. Sheet yang bukan "ringkasan"/"masih dipantau" → alternatif aman
    //   3. Sheet pertama yang bukan "ringkasan"
    //   4. Sheet pertama apa pun (fallback terakhir)
    const sheet =
      workbook.worksheets.find((ws) => /selesai/i.test(ws.name)) ||
      workbook.worksheets.find(
        (ws) => !/ringkasan/i.test(ws.name) && !/masih.?dipantau/i.test(ws.name)
      ) ||
      workbook.worksheets.find((ws) => !/ringkasan/i.test(ws.name)) ||
      workbook.worksheets[0];

    if (!sheet) {
      return res.status(400).json({
        success: false,
        message: "File Excel tidak berisi sheet data apa pun.",
      });
    }

    const hasilHeader = cariBarisHeader(sheet);
    if (!hasilHeader) {
      return res.status(400).json({
        success: false,
        message:
          "Format file tidak dikenali. Pastikan file memiliki kolom seperti hasil export TUNTAS (Kode Laporan, Uraian Ketidaksesuaian, Penyebab, dst).",
      });
    }
    const { headerRowNum, petaKolom } = hasilHeader;

    const barisSiapInsert = [];
    for (let r = headerRowNum + 1; r <= sheet.rowCount; r++) {
      const row     = sheet.getRow(r);
      const kode    = ambilNilaiSel(row, petaKolom.kode);
      const uraian  = ambilNilaiSel(row, petaKolom.uraian);
      if (!kode && !uraian) continue; // lewati baris kosong / baris "Tidak ada data"

      barisSiapInsert.push([
        tahun,
        kode,
        ambilNilaiSel(row, petaKolom.jenis),
        ambilNilaiSel(row, petaKolom.tglMasuk),
        uraian,
        ambilNilaiSel(row, petaKolom.unit),
        ambilNilaiSel(row, petaKolom.penyebab),
        ambilNilaiSel(row, petaKolom.rencana),
        ambilNilaiSel(row, petaKolom.hasil),
        ambilNilaiSel(row, petaKolom.tglPelaks),
        ambilNilaiSel(row, petaKolom.statusReview),
        ambilNilaiSel(row, petaKolom.statusBoxing),
        req.file.originalname,
        req.user?.id ?? null,
      ]);
    }

    if (barisSiapInsert.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak ditemukan baris data yang bisa dibaca dari file ini.",
      });
    }

    // Upload ulang utk tahun yang sama akan MENGGANTI (bukan menumpuk)
    // arsip tahun tsb, supaya tidak terjadi data dobel kalau staf
    // mengupload file yang sama / versi revisi.
    await pool.query(`DELETE FROM arsip_rekapitulasi WHERE tahun = ?`, [tahun]);

    const placeholder = barisSiapInsert.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
    await pool.query(
      `INSERT INTO arsip_rekapitulasi
        (tahun, kode_laporan, jenis_laporan, tgl_masuk, uraian_ketidaksesuaian, unit,
         penyebab, rencana_tindakan, hasil_tindakan, tgl_pelaksanaan, status_review,
         status_boxing, nama_file_asal, diupload_oleh)
       VALUES ${placeholder}`,
      barisSiapInsert.flat()
    );

    return res.status(200).json({
      success: true,
      message: `Berhasil mengimpor ${barisSiapInsert.length} baris data arsip tahun ${tahun}.`,
      jumlah: barisSiapInsert.length,
      tahun,
    });
  } catch (error) {
    console.error("Error uploadArsipRekap:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memproses file Excel. Pastikan file tidak rusak dan formatnya sesuai.",
    });
  }
}

// ============================================================
// 7c. GET ARSIP REKAP — GET /api/staf/rekap/arsip
//     Ambil data arsip (opsional filter ?tahun=2024), dipakai
//     saat export Excel supaya data lama ikut disertakan rapi
//     per tahun.
// ============================================================
async function getArsipRekap(req, res) {
  try {
    const { tahun } = req.query;
    let query = `
      SELECT tahun, kode_laporan, jenis_laporan, tgl_masuk, uraian_ketidaksesuaian,
             unit, penyebab, rencana_tindakan, hasil_tindakan, tgl_pelaksanaan,
             status_review, status_boxing
      FROM arsip_rekapitulasi`;
    const params = [];
    if (tahun) {
      query += ` WHERE tahun = ?`;
      params.push(tahun);
    }
    query += ` ORDER BY tahun DESC, tgl_masuk DESC, id_arsip ASC`;

    const [rows] = await pool.query(query, params);
    const tahunTersedia = [...new Set(rows.map((r) => r.tahun))].sort((a, b) => b - a);

    return res.status(200).json({ success: true, data: rows, tahunTersedia });
  } catch (error) {
    console.error("Error getArsipRekap:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data arsip rekapitulasi.",
    });
  }
}

// ============================================================
// 7d. DELETE ARSIP REKAP — DELETE /api/staf/rekap/arsip?tahun=2024
//     Hapus data arsip Excel tahun tertentu yang sudah pernah
//     diupload lewat "Upload Data Lama". Wajib sertakan ?tahun=
//     supaya staf tidak salah hapus semua arsip sekaligus.
// ============================================================
async function deleteArsipRekap(req, res) {
  try {
    const { tahun } = req.query;
    if (!tahun) {
      return res.status(400).json({
        success: false,
        message: "Tahun wajib diisi untuk menghapus data arsip.",
      });
    }

    const tahunInt = parseInt(tahun, 10);
    const [existing] = await pool.query(
      `SELECT COUNT(*) as jumlah FROM arsip_rekapitulasi WHERE tahun = ?`,
      [tahunInt]
    );
    const jumlah = existing[0]?.jumlah ?? 0;
    if (jumlah === 0) {
      return res.status(404).json({
        success: false,
        message: `Tidak ada data arsip untuk tahun ${tahunInt}.`,
      });
    }

    await pool.query(`DELETE FROM arsip_rekapitulasi WHERE tahun = ?`, [tahunInt]);

    return res.status(200).json({
      success: true,
      message: `Berhasil menghapus ${jumlah} baris data arsip tahun ${tahunInt}.`,
      tahun: tahunInt,
    });
  } catch (error) {
    console.error("Error deleteArsipRekap:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus data arsip.",
    });
  }
}

// ============================================================
// 8. APPROVAL STAF — PATCH /api/staf/approval-boxing
//    Staf P4M menentukan: diterima atau ditolak setelah lihat hasil unit
//    Body: { id_boxing, approval }  → approval: "diterima" | "ditolak"
//
//    ✅ FIX BUG #1: "diterima" SEKARANG otomatis menyelesaikan laporan
//    (status_boxing → 'selesai' + sinkronisasi laporan_ketidaksesuaian),
//    jadi begitu Staf klik ✓, laporan otomatis pindah ke Rekapitulasi
//    sebagai "Selesai" — tidak perlu langkah tombol "Selesai" terpisah
//    lagi. Kalau "ditolak", laporan TETAP di status 'di_staff' supaya
//    Kepala Unit bisa merevisi hasil pelaksanaannya di tab "Laporan
//    Hasil" (lihat juga fix terkait di kepalaUnitController.js).
//
//    ✅ FIX BUG #3: "ditolak" TIDAK LAGI mengosongkan penyebab &
//    rencana tindak lanjut yang sudah ditulis Kepala Unit. Laporan
//    hanya "dibuka lagi" (status_review → 'menunggu_keputusan_ka')
//    supaya kotaknya bisa diedit ulang — isinya tetap ada, Kepala
//    Unit tinggal koreksi kalau memang ada yang salah. Yang dihapus
//    hanya pelaksanaan_tindakan (hasil unit), karena itu memang
//    bagian yang direvisi.
// ============================================================
async function setApprovalStaf(req, res) {
  const { id_boxing, approval, catatan } = req.body;
  const validApproval = ["diterima", "ditolak"];
  if (!id_boxing || !validApproval.includes(approval)) {
    return res.status(400).json({
      success: false,
      message: "id_boxing dan approval (diterima|ditolak) wajib diisi.",
    });
  }
  if (!catatan || !String(catatan).trim()) {
    return res.status(400).json({
      success: false,
      message: "Catatan / alasan approval wajib diisi.",
    });
  }
  try {
    const [rows] = await pool.query(
      `SELECT b.id_boxing, b.id_laporan, b.status AS status_boxing
       FROM boxing_ketidaksesuaian b
       WHERE b.id_boxing = ?`,
      [id_boxing]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data boxing tidak ditemukan.",
      });
    }
    const row = rows[0];
    if (row.status_boxing !== "di_staff") {
      return res.status(400).json({
        success: false,
        message: "Approval hanya bisa dilakukan jika laporan sudah ada di Staf P4M (di_staff).",
      });
    }

    if (approval === "diterima") {
      // ✅ FIX: langsung selesai, sekali jalan.
      await pool.query(
        `UPDATE boxing_ketidaksesuaian
         SET approval_staf = ?, catatan_approval = ?, status = 'selesai'
         WHERE id_boxing = ?`,
        [approval, catatan.trim(), id_boxing]
      );
      await syncStatusLaporan(row.id_laporan);
    } else {
      // "ditolak" → laporan dibuka lagi supaya Kepala Unit bisa isi
      // ULANG di tab "Ketidaksesuaian Masuk". Penyebab & rencana yang
      // SUDAH ADA dibiarkan (TIDAK di-NULL-kan) — Kepala Unit tinggal
      // edit kalau memang ada yang salah, atau kirim ulang apa adanya
      // kalau sudah benar. Hanya status_review yang direset supaya
      // kotaknya jadi editable lagi.
      await pool.query(
        `UPDATE boxing_ketidaksesuaian
         SET approval_staf = ?, catatan_approval = ?
         WHERE id_boxing = ?`,
        [approval, catatan.trim(), id_boxing]
      );
      await pool.query(
        `UPDATE rancangan_tindakan
         SET status_review = 'menunggu_keputusan_ka', updated_at = NOW()
         WHERE id_boxing = ?`,
        [id_boxing]
      );
      // Hapus pelaksanaan lama supaya tab Laporan Hasil bersih —
      // ini yang memang mau direvisi, bukan penyebab/rencananya.
      await pool.query(
        `DELETE FROM pelaksanaan_tindakan WHERE id_boxing = ?`,
        [id_boxing]
      );
    }

    const pesan =
      approval === "diterima"
        ? "Hasil tindak lanjut unit DITERIMA. Laporan otomatis ditandai SELESAI dan masuk Rekapitulasi."
        : "Hasil tindak lanjut unit DITOLAK oleh Staf P4M. Laporan dibuka kembali ke Kepala Unit untuk direvisi.";
    return res.status(200).json({ success: true, message: pesan });
  } catch (error) {
    console.error("Error setApprovalStaf:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan approval.",
    });
  }
}

// ============================================================
// EXPORT SEMUA FUNGSI
// ============================================================
module.exports = {
  getLaporanMasuk,
  getKepalaUnit,
  distribusiLaporan,
  getProsesMonitor,
  inputHasilPemantauan,
  setKeputusanBoxing,
  getRekapitulasi,
  uploadArsipRekap,
  getArsipRekap,
  deleteArsipRekap,
  setApprovalStaf,
};