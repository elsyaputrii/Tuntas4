// FILE: backend/controllers/stafController.js
// Menangani semua fitur Staf P4M + fungsi reviewRancangan
// yang juga dipakai oleh Ka P4M lewat endpoint /staf/review-rancangan
//
// Daftar fungsi:
//   1. getLaporanMasuk      → lihat laporan masuk (status: menunggu)
//   2. getKepalaUnit        → daftar kepala unit untuk dropdown
//   3. distribusiLaporan    → kirim laporan ke kepala unit (boxing)
//   4. getProsesMonitor     → lihat semua proses + rancangan + pelaksanaan
//   5. setKeputusanBoxing   → Staf P4M "Buka ke Unit" (reopen) saja
//   6. inputHasilPemantauan → Staf P4M input hasil pemantauan lapangan
//   7. getRekapitulasi      → ringkasan semua laporan dari awal sampai selesai
//   8. setApprovalStaf      → keputusan "Siap" (✅) / "Belum Siap" (❌) atas
//                              hasil tindak lanjut unit.

const { pool } = require("../config/db");
const { notifikasiUntukPengguna } = require("../utils/notifikasi");
const { UNITS_UMUM } = require("../constants/unitsUmum");

// ============================================================
// 1. GET LAPORAN MASUK
// ============================================================
async function getLaporanMasuk(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
        id_laporan,
        kode_laporan,
        status_pelapor,
        jenis_laporan,
        deskripsi,
        lampiran,
        status,
        tanggal_kejadian,
        created_at
      FROM laporan_ketidaksesuaian
      WHERE status = 'menunggu'
      ORDER BY created_at ASC`
    );

    const data = rows;

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
    const kepalaUntukNotif = [];
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
// ============================================================
async function getProsesMonitor(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
        l.id_laporan,
        l.kode_laporan,
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
        r.created_at           AS tanggal_perencanaan,

        p.deskripsi           AS hasil_tindakan,
        p.lampiran            AS lampiran_hasil,
        p.tanggal             AS tanggal_pelaksanaan
      FROM boxing_ketidaksesuaian b
      JOIN laporan_ketidaksesuaian l    ON l.id_laporan = b.id_laporan
      LEFT JOIN rancangan_tindakan r    ON r.id_boxing  = b.id_boxing
      LEFT JOIN pelaksanaan_tindakan p  ON p.id_boxing  = b.id_boxing
      ORDER BY l.created_at DESC`
    );

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error getProsesMonitor:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data proses & monitor.",
    });
  }
}

// ============================================================
// 5. HELPER: Sync status laporan induk
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

// ============================================================
// 5b. SET KEPUTUSAN BOXING (reopen — "Buka ke Unit")
// ============================================================
async function setKeputusanBoxing(req, res) {
  const { id_boxing, keputusan } = req.body;

  let aksi = keputusan;
  const valid = ["lanjut", "ditindak_lanjut"];
  if (!id_boxing || !valid.includes(aksi)) {
    return res.status(400).json({
      success: false,
      message:
        "id_boxing dan keputusan (lanjut|ditindak_lanjut) wajib diisi. Staf P4M hanya bisa membuka kembali laporan ke Unit, keputusan selesai/tidak sepenuhnya wewenang Ka P4M.",
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

      await conn.query(
        `UPDATE boxing_ketidaksesuaian
         SET status = 'terdistribusi', approval_staf = 'menunggu'
         WHERE id_boxing = ?`,
        [id_boxing]
      );

      if (row.id_rancangan) {
        await conn.query(
          `UPDATE rancangan_tindakan
           SET status_review = 'menunggu_keputusan_ka', aksi_masukan = NULL, updated_at = NOW()
           WHERE id_boxing = ?`,
          [id_boxing]
        );
      }

      await conn.query(
        `DELETE FROM pelaksanaan_tindakan WHERE id_boxing = ?`,
        [id_boxing]
      );

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
      message: "Laporan dibuka kembali ke Unit — Penyebab & Rencana sebelumnya tetap tersimpan dan siap diedit ulang oleh Kepala Unit.",
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
// 7. GET REKAPITULASI
// ============================================================
async function getRekapitulasi(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
        l.id_laporan,
        l.kode_laporan,
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
        r.created_at           AS tanggal_perencanaan,

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

    const data = rows;

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
// 7b. UPLOAD ARSIP REKAP
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
      if (!kode && !uraian) continue;

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
// 7c. GET ARSIP REKAP
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
// 7d. DELETE ARSIP REKAP
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
// 8. APPROVAL STAF — PATCH /api/staf/approval-hasil
//    ✅ DITAMBAHKAN console.log DEBUG di beberapa titik untuk
//    melacak error "Unexpected token '1', '19' is not valid JSON".
//    Hapus log-log ini setelah bug ketemu.
// ============================================================
async function setApprovalStaf(req, res) {
  console.log("🎯 [setApprovalStaf] === DIPANGGIL ===");
  console.log("🎯 [setApprovalStaf] req.body:", JSON.stringify(req.body));
  console.log("🎯 [setApprovalStaf] req.user:", JSON.stringify(req.user));

  const { id_boxing, approval, catatan } = req.body;
  const validApproval = ["diterima", "ditolak"];

  console.log("🎯 [setApprovalStaf] id_boxing:", id_boxing, "| approval:", approval, "| catatan:", catatan);

  if (!id_boxing || !validApproval.includes(approval)) {
    console.log("❌ [setApprovalStaf] VALIDASI GAGAL — id_boxing atau approval tidak valid");
    return res.status(400).json({
      success: false,
      message: "id_boxing dan approval (diterima|ditolak) wajib diisi.",
    });
  }
  if (!catatan || !String(catatan).trim()) {
    console.log("❌ [setApprovalStaf] VALIDASI GAGAL — catatan kosong");
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
      console.log("❌ [setApprovalStaf] Boxing tidak ditemukan untuk id_boxing:", id_boxing);
      return res.status(404).json({
        success: false,
        message: "Data boxing tidak ditemukan.",
      });
    }
    const row = rows[0];
    console.log("🎯 [setApprovalStaf] row dari DB:", JSON.stringify(row));

    if (row.status_boxing !== "di_staff") {
      console.log("❌ [setApprovalStaf] status_boxing bukan di_staff:", row.status_boxing);
      return res.status(400).json({
        success: false,
        message: "Approval hanya bisa dilakukan jika laporan sudah ada di Staf P4M (di_staff).",
      });
    }

    if (approval === "diterima") {
      console.log("🎯 [setApprovalStaf] Proses 'diterima' — UPDATE status=selesai");
      await pool.query(
        `UPDATE boxing_ketidaksesuaian
         SET approval_staf = ?, catatan_approval = ?, status = 'selesai'
         WHERE id_boxing = ?`,
        [approval, catatan.trim(), id_boxing]
      );
      console.log("✅ [setApprovalStaf] UPDATE boxing sukses, panggil syncStatusLaporan");
      await syncStatusLaporan(row.id_laporan);
      console.log("✅ [setApprovalStaf] syncStatusLaporan sukses");
    } else {
      // ✅ FIX: sebelumnya status_boxing diubah ke 'menunggu_pelaksanaan' tapi
      // rancangan_tindakan.status_review TIDAK PERNAH direset. Akibatnya:
      //   - Laporan yang PUNYA hasil_tindakan → kebetulan masih ketemu
      //     (status_review lama 'ditindaklanjuti' + status baru
      //     'menunggu_pelaksanaan' cocok dgn query getLaporanHasil).
      //   - Laporan yang TIDAK PUNYA hasil_tindakan (mis. Ka P4M sudah
      //     putuskan "Sesuai" / tidak_ditindaklanjuti, jadi tidak pernah
      //     ada tahap isi hasil) → status_review-nya TETAP
      //     'tidak_ditindaklanjuti'. Kombinasi status baru +
      //     status_review lama itu TIDAK cocok dgn query getLaporanMasuk
      //     MAUPUN getLaporanHasil di kepalaUnitController.js — laporan
      //     jadi ghaib, tombol ❌ jadi sia-sia karena Kepala Unit gak
      //     bisa lihat atau kirim ulang apa-apa.
      //
      // Fix: ikuti desain yang sudah didokumentasikan di kepalaUnitController.js
      // (lihat komentar di atas getLaporanMasuk) — status_boxing TETAP
      // 'di_staff', dan status_review dikembalikan ke
      // 'menunggu_keputusan_ka' supaya laporan otomatis muncul lagi di
      // tab "Ketidaksesuaian Masuk" Kepala Unit (penyebab & rencana lama
      // TETAP ada, tidak perlu diketik ulang dari nol), lalu harus lewat
      // keputusan Ka P4M lagi sebelum Kepala Unit bisa isi hasil baru.
      console.log("🎯 [setApprovalStaf] Proses 'ditolak' — kembalikan ke Ka P4M lewat Kepala Unit");
      await pool.query(
        `UPDATE boxing_ketidaksesuaian
         SET approval_staf = ?, catatan_approval = ?
         WHERE id_boxing = ?`,
        [approval, catatan.trim(), id_boxing]
      );
      console.log("✅ [setApprovalStaf] UPDATE boxing (ditolak) sukses — status_boxing TETAP 'di_staff'");

      await pool.query(
        `UPDATE rancangan_tindakan
         SET status_review = 'menunggu_keputusan_ka', aksi_masukan = NULL, updated_at = NOW()
         WHERE id_boxing = ?`,
        [id_boxing]
      );
      console.log("✅ [setApprovalStaf] rancangan_tindakan.status_review direset ke 'menunggu_keputusan_ka'");

      await pool.query(
        `DELETE FROM pelaksanaan_tindakan WHERE id_boxing = ?`,
        [id_boxing]
      );
      console.log("✅ [setApprovalStaf] DELETE pelaksanaan lama sukses");

      await pool.query(
        `UPDATE laporan_ketidaksesuaian SET status = 'diproses' WHERE id_laporan = ?`,
        [row.id_laporan]
      );
    }

    const pesan =
      approval === "diterima"
        ? "Hasil tindak lanjut unit DITERIMA. Laporan otomatis ditandai SELESAI dan masuk Rekapitulasi."
        : "Hasil tindak lanjut unit DITOLAK oleh Staf P4M. Laporan dikirim kembali ke tab Ketidaksesuaian Masuk Kepala Unit untuk direvisi Penyebab & Rencana Tindak Lanjut (data lama tetap ada), lalu menunggu keputusan ulang Ka P4M.";

    console.log("✅ [setApprovalStaf] === SELESAI — kirim response sukses ===");
    return res.status(200).json({ success: true, message: pesan });
  } catch (error) {
    console.error("❌ [setApprovalStaf] ERROR:", error);
    console.error("❌ [setApprovalStaf] error.message:", error.message);
    console.error("❌ [setApprovalStaf] error.stack:", error.stack);
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