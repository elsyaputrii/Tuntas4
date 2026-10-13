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

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const UPLOAD_DIR = require("../config/uploadDir");
const { pool } = require("../config/db");
const { notifikasiUntukPengguna, notifikasiUntukRole } = require("../utils/notifikasi");
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

      // ✅ FIX: unit P4M ditangani langsung oleh akun Ka P4M (menu Kepala Unit
      // sudah tergabung di sana), jadi akun "Kepala Unit P4M" terpisah tidak
      // wajib ada. Tanpa ini, setelah akun itu dihapus, distribusi ke P4M
      // selalu gagal dengan pesan "belum terdaftar".
      // boxing.id_kepala boleh NULL (lihat database/add_unit_tujuan.sql).
      const unitIniP4M = unit === "P4M";

      if (kepalaRows.length === 0 && !unitIniP4M) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          success: false,
          message: `Kepala unit untuk "${unit}" belum terdaftar. Jalankan seed akun kepala unit terlebih dahulu.`,
        });
      }

      const id_kepala = kepalaRows[0]?.id_kepala ?? null;
      const id_pengguna_kepala = kepalaRows[0]?.id_pengguna ?? null;

      if (unitIniP4M) {
        // semua akun Ka P4M dikabari (id_pengguna null = pakai role)
        kepalaUntukNotif.push({ role: "ka_p4m", unit });
      }
      if (id_pengguna_kepala) {
        kepalaUntukNotif.push({ id_pengguna: id_pengguna_kepala, unit });
      }

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
      const isi = {
        judul: "Laporan Baru untuk Unit Anda",
        pesan: `Ada laporan ketidaksesuaian baru yang didistribusikan ke unit ${k.unit}. Mohon segera ditindaklanjuti.`,
        jenis: "distribusi_unit",
        // Ka P4M membuka menu Kepala Unit lewat prefix /ka-p4m/kepala-unit
        link:
          k.role === "ka_p4m"
            ? "/ka-p4m/kepala-unit/ketidaksesuaian-masuk"
            : "/kepala-unit/ketidaksesuaian-masuk",
      };
      if (k.role) {
        notifikasiUntukRole(k.role, isi);
      } else {
        notifikasiUntukPengguna(k.id_pengguna, isi);
      }
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
      await conn.query(`UPDATE boxing_ketidaksesuaian SET status = 'terdistribusi', approval_staf = 'menunggu' WHERE id_boxing = ?`, [id_boxing]);

      if (row.id_rancangan) await conn.query(`UPDATE rancangan_tindakan SET status_review = 'menunggu_keputusan_ka', aksi_masukan = NULL, updated_at = NOW() WHERE id_boxing = ?`, [id_boxing]);

      await conn.query(`DELETE FROM pelaksanaan_tindakan WHERE id_boxing = ?`, [id_boxing]);
      await conn.query(`UPDATE laporan_ketidaksesuaian SET status = 'diproses' WHERE id_laporan = ?`, [row.id_laporan]);
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    return res.status(200).json({
      success: true, message: "Laporan dibuka kembali ke Unit — Penyebab & Rencana sebelumnya tetap tersimpan dan siap diedit ulang oleh Kepala Unit.", });
  } catch (error) {
    console.error("Error setKeputusanBoxing:", error);
    return res.status(500).json({
      success: false, message: "Gagal menyimpan tinjauan.",});
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
      success: false, message: "id_boxing dan hasil pemantauan wajib diisi.",
    });
  }

  try {
    const [stafRows] = await pool.query(
      `SELECT id_staf FROM staf_p4m WHERE id_pengguna = ?`,
      [id_pengguna]
    );

    if (stafRows.length === 0) {
      return res.status(403).json({
        success: false, message: "Data staf P4M tidak ditemukan.",
      });
    }
    const id_staf = stafRows[0].id_staf;

    const [pelaksanaan] = await pool.query(
      `SELECT id_pelaksanaan FROM pelaksanaan_tindakan WHERE id_boxing = ?`,
      [id_boxing]
    );

    if (pelaksanaan.length === 0) {
      return res.status(400).json({
        success: false, message: "Kepala Unit belum menginput laporan hasil pelaksanaan.",
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
      success: true, message: "Hasil pemantauan berhasil disimpan.",
      data: { id_pemantauan: result.insertId },
    });
  } catch (error) {
    console.error("Error inputHasilPemantauan:", error);
    return res.status(500).json({
      success: false, message: "Gagal menyimpan hasil pemantauan.",
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
      success: false, message: "Gagal mengambil data rekapitulasi.",
    });
  }
}

// ============================================================
// 7b. UPLOAD ARSIP REKAP
// ============================================================
const KOLOM_ALIAS = {
  // "no" (nomor urut) DIPISAH dari "kode". Di file hasil export aplikasi kolom
  // "No" ada di kiri "Kode Laporan"; kalau kode kosong ("—"), baris tetap
  // dikenali sebagai laporan BARU lewat nomor urut (bukan digabung ke baris atas).
  no: ["no", "no.", "nomor", "nomor urut"],
  kode: ["kode laporan", "kode", "nomor laporan"],
  jenis: ["jenis laporan", "jenis", "jenis ketidaksesuaian"],
  tglMasuk: ["tgl masuk", "tanggal masuk", "tanggal", "tgl", "tanggal laporan"],
  uraian: ["uraian ketidaksesuaian", "uraian", "deskripsi", "uraian masalah"],
  unit: ["unit", "bagian", "unit/bagian", "unit pelaksana"],
  penyebab: ["penyebab", "penyebab ketidaksesuaian"],
  rencana: ["rencana tindakan", "rencana", "tindakan pencegahan"],
  hasil: ["hasil tindak lanjut", "hasil", "hasil tindakan", "tindakan koreksi"],
  tglPelaks: ["tgl pelaksanaan", "tanggal pelaksanaan", "tanggal selesai", "tgl selesai"],
  statusReview: ["status review"],
  statusBoxing: ["status proses", "status boxing", "status (open/close)", "status"],
  fotoAwal: ["foto laporan", "lampiran laporan", "gambar laporan"],
  fotoHasil: ["foto hasil", "lampiran hasil", "gambar hasil"],
};

function normalisasiHeader(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function cariBarisHeader(sheet) {
  const batasBaris = Math.min(sheet.rowCount, 15);

  for (let r = 1; r <= batasBaris; r++) {
    const row = sheet.getRow(r);
    const terbaik = {}; // key -> { prio, colNumber }

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      let teks = cell.value;
      if (teks == null) return;
      if (typeof teks === "object") {
        teks = Array.isArray(teks.richText)
          ? teks.richText.map((x) => x?.text ?? "").join("")
          : teks.text ?? teks.result ?? "";
      }
      teks = normalisasiHeader(teks);
      if (!teks) return;

      for (const [key, aliases] of Object.entries(KOLOM_ALIAS)) {
        const prio = aliases.findIndex((a) => normalisasiHeader(a) === teks);
        if (prio === -1) continue;
        if (!terbaik[key] || prio < terbaik[key].prio) {
          terbaik[key] = { prio, colNumber };
        }
      }
    });

    const petaKolom = {};
    for (const [key, v] of Object.entries(terbaik)) petaKolom[key] = v.colNumber;

    const jumlahCocok = Object.keys(petaKolom).filter(
      (k) => k !== "fotoAwal" && k !== "fotoHasil" && k !== "no"
    ).length;
    if (jumlahCocok >= 3) return { headerRowNum: r, petaKolom };
  }
  return null;
}

// Ambil gambar tertanam di sheet -> Map<nomorBaris, { awal?, hasil? }>
// ✅ FIX: kalau file TIDAK punya kolom "Foto Laporan"/"Foto Hasil" (mis. Excel
// lama buatan staf), gambar tetap diambil: gambar pertama di baris = foto
// laporan, gambar kedua (paling kanan) = foto hasil.
function kumpulkanGambar(workbook, sheet, petaKolom, headerRowNum) {
  const hasil = new Map();
  let daftar = [];
  try { daftar = sheet.getImages(); } catch { return hasil; }

  const adaKolomFoto = !!(petaKolom.fotoAwal || petaKolom.fotoHasil);
  const perBaris = new Map(); // baris -> [{ kolom, buffer, ext }]

  for (const img of daftar) {
    const tl = img.range?.tl;
    if (!tl) continue;
    const kolom = (tl.nativeCol ?? Math.floor(tl.col)) + 1;
    const baris = (tl.nativeRow ?? Math.floor(tl.row)) + 1;
    if (baris <= headerRowNum) continue;

    const media = workbook.getImage(img.imageId);
    if (!media || !media.buffer) continue;
    const ext = String(media.extension || "").toLowerCase().replace("jpeg", "jpg");
    if (!["png", "jpg", "gif"].includes(ext)) continue;

    if (!perBaris.has(baris)) perBaris.set(baris, []);
    perBaris.get(baris).push({ kolom, buffer: media.buffer, ext });
  }

  for (const [baris, list] of perBaris) {
    list.sort((a, b) => a.kolom - b.kolom);
    const entry = {};
    if (adaKolomFoto) {
      for (const g of list) {
        if (g.kolom === petaKolom.fotoAwal && !entry.awal) entry.awal = g;
        else if (g.kolom === petaKolom.fotoHasil && !entry.hasil) entry.hasil = g;
      }
    } else {
      if (list[0]) entry.awal = list[0];
      if (list[1]) entry.hasil = list[list.length - 1];
    }
    if (entry.awal || entry.hasil) hasil.set(baris, entry);
  }
  return hasil;
}

const ARSIP_IMG_SUBDIR = "arsip";

function simpanGambarArsip(media) {
  const dir = path.join(UPLOAD_DIR, ARSIP_IMG_SUBDIR);
  fs.mkdirSync(dir, { recursive: true });
  const nama = `${crypto.randomBytes(12).toString("hex")}.${media.ext}`;
  fs.writeFileSync(path.join(dir, nama), media.buffer);
  return `${ARSIP_IMG_SUBDIR}/${nama}`;
}

function hapusFileArsip(relPath) {
  if (!relPath || !relPath.startsWith(`${ARSIP_IMG_SUBDIR}/`)) return;
  const full = path.join(UPLOAD_DIR, relPath);
  if (!full.startsWith(path.join(UPLOAD_DIR, ARSIP_IMG_SUBDIR))) return;
  fs.promises.unlink(full).catch(() => {});
}

function bersihkanPlaceholder(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return /^[—–-]+$/.test(t) || t === "" ? null : v;
}

function ambilNilaiSel(row, colNumber) {
  return bersihkanPlaceholder(ambilNilaiSelMentah(row, colNumber));
}

function ambilNilaiSelMentah(row, colNumber) {
  if (!colNumber) return null;
  const cell = row.getCell(colNumber);
  if (!cell) return null;
  const nilai = cell.value;
  if (nilai == null) return null;

  if (nilai instanceof Date) return nilai.toISOString().slice(0, 10);

  if (typeof nilai === "string" || typeof nilai === "number" || typeof nilai === "boolean") {
    const teks = String(nilai).trim();
    return teks === "" ? null : teks;
  }

  if (typeof nilai === "object") {
    if (nilai.result != null) {
      if (nilai.result instanceof Date) return nilai.result.toISOString().slice(0, 10);
      const teks = String(nilai.result).trim();
      return teks === "" ? null : teks;
    }
    if (Array.isArray(nilai.richText)) {
      const teks = nilai.richText.map((item) => item?.text ?? "").join("").trim();
      return teks === "" ? null : teks;
    }
    if (typeof nilai.text === "string") {
      const teks = nilai.text.trim();
      return teks === "" ? null : teks;
    }
    if (nilai.hyperlink) {
      const teks = nilai.text ?? nilai.hyperlink;
      return String(teks).trim() || null;
    }
    return null;
  }
  return String(nilai).trim() || null;
}

// Potong teks supaya tidak melebihi panjang kolom VARCHAR (kalau lebih,
// MySQL strict mode menolak INSERT dan SELURUH import gagal).
function potong(v, maks) {
  if (v == null) return null;
  const s = String(v);
  return s.length > maks ? s.slice(0, maks) : s;
}

// Pastikan kolom lampiran ada di tabel arsip (migrasi otomatis, aman diulang)
let kolomArsipSiap = false;
async function pastikanKolomLampiranArsip(conn) {
  if (kolomArsipSiap) return;
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'arsip_rekapitulasi'
       AND COLUMN_NAME IN ('lampiran_laporan','lampiran_hasil')`
  );
  const ada = new Set(cols.map((c) => c.COLUMN_NAME));
  for (const kol of ["lampiran_laporan", "lampiran_hasil"]) {
    if (!ada.has(kol)) {
      await conn.query(`ALTER TABLE arsip_rekapitulasi ADD COLUMN ${kol} VARCHAR(255) NULL`);
    }
  }
  kolomArsipSiap = true;
}

// Baca SATU sheet -> array laporan. null kalau header tidak dikenali.
function bacaSheetArsip(workbook, sheet, meta) {
  const hasilHeader = cariBarisHeader(sheet);
  if (!hasilHeader) return null;
  const { headerRowNum, petaKolom } = hasilHeader;
  const gambarPerBaris = kumpulkanGambar(workbook, sheet, petaKolom, headerRowNum);

  const daftar = [];
  let laporanSaatIni = null;

  for (let r = headerRowNum + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    const noVal = ambilNilaiSel(row, petaKolom.no);
    const kode = ambilNilaiSel(row, petaKolom.kode);
    const jenis = ambilNilaiSel(row, petaKolom.jenis);
    const tglMasuk = ambilNilaiSel(row, petaKolom.tglMasuk);
    const uraian = ambilNilaiSel(row, petaKolom.uraian);
    const unit = ambilNilaiSel(row, petaKolom.unit);
    const penyebab = ambilNilaiSel(row, petaKolom.penyebab);
    const rencana = ambilNilaiSel(row, petaKolom.rencana);
    const hasil = ambilNilaiSel(row, petaKolom.hasil);
    const tglPelaks = ambilNilaiSel(row, petaKolom.tglPelaks);
    const statusReview = ambilNilaiSel(row, petaKolom.statusReview);
    const statusBoxing = ambilNilaiSel(row, petaKolom.statusBoxing);

    const semuaNilai = [
      kode, jenis, tglMasuk, uraian, unit, penyebab, rencana, hasil,
      tglPelaks, statusReview, statusBoxing,
    ].filter(Boolean).join(" ").trim();

    // STOP FOOTER (tanda tangan)
    if (
      /^Batam,\s*\d{1,2}\s+\w+\s+\d{4}$/i.test(semuaNilai) ||
      /^Kepala P4M$/i.test(semuaNilai) ||
      /^\(.+\)$/.test(semuaNilai) && !uraian
    ) {
      break;
    }

    const kodeText = kode == null ? null : String(kode).trim() || null;
    const noText = noVal == null ? null : String(noVal).trim() || null;

    // Baris "Tidak ada data" -> lewati
    if (/^tidak ada data$/i.test(kodeText ?? noText ?? "")) continue;

    // Identitas laporan: kode kalau ada, kalau tidak pakai nomor urut.
    const idKey = kodeText || (noText ? `NO:${noText}` : null);
    const kodeBaru = !!idKey && (!laporanSaatIni || laporanSaatIni.idKey !== idKey);

    if (kodeBaru) {
      laporanSaatIni = {
        idKey,
        // kalau file tidak punya kolom kode sama sekali, nomor urut dipakai sebagai kode (perilaku lama)
        kode: kodeText || (!petaKolom.kode ? noText : null),
        jenis, tglMasuk, uraian, unit, penyebab, rencana, hasil,
        tglPelaks, statusReview, statusBoxing,
        mediaAwal: null, mediaHasil: null,
      };
      daftar.push(laporanSaatIni);
    } else if (laporanSaatIni) {
      if (jenis) laporanSaatIni.jenis = jenis;
      if (tglMasuk) laporanSaatIni.tglMasuk = tglMasuk;
      if (unit) laporanSaatIni.unit = unit;
      if (tglPelaks) laporanSaatIni.tglPelaks = tglPelaks;
      if (statusReview) laporanSaatIni.statusReview = statusReview;
      if (statusBoxing) laporanSaatIni.statusBoxing = statusBoxing;
      if (uraian) laporanSaatIni.uraian = laporanSaatIni.uraian ? `${laporanSaatIni.uraian}\n${uraian}` : uraian;
      if (penyebab) laporanSaatIni.penyebab = laporanSaatIni.penyebab ? `${laporanSaatIni.penyebab}\n${penyebab}` : penyebab;
      if (rencana) laporanSaatIni.rencana = laporanSaatIni.rencana ? `${laporanSaatIni.rencana}\n${rencana}` : rencana;
      if (hasil) laporanSaatIni.hasil = laporanSaatIni.hasil ? `${laporanSaatIni.hasil}\n${hasil}` : hasil;
    }

    // Gambar di baris ini -> laporan yang sedang diproses
    const g = gambarPerBaris.get(r);
    if (g && laporanSaatIni) {
      if (g.awal && !laporanSaatIni.mediaAwal) laporanSaatIni.mediaAwal = g.awal;
      if (g.hasil && !laporanSaatIni.mediaHasil) laporanSaatIni.mediaHasil = g.hasil;
    }
  }

  daftar.forEach((l) => Object.assign(l, meta));
  return daftar;
}

async function uploadArsipRekap(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "File Excel wajib diunggah." });
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

    // ✅ FIX: baca SEMUA sheet data (Laporan Masih Dipantau + Laporan Selesai +
    // Arsip/Tahun ...), bukan hanya 1 sheet. Sheet "Ringkasan" dilewati.
    const sheetData = workbook.worksheets.filter((ws) => !/ringkasan/i.test(ws.name));
    if (sheetData.length === 0) {
      return res.status(400).json({ success: false, message: "File Excel tidak berisi sheet data apa pun." });
    }

    const meta = { tahun, namaFileAsal: req.file.originalname, diuploadOleh: req.user?.id ?? null };
    const barisSiapInsert = [];
    const sudahAda = new Set(); // cegah dobel kalau 1 laporan muncul di >1 sheet
    let adaSheetValid = false;

    for (const sheet of sheetData) {
      const daftar = bacaSheetArsip(workbook, sheet, meta);
      if (!daftar) continue;
      adaSheetValid = true;
      for (const l of daftar) {
        const kunci = l.kode ? `K:${l.kode}` : null;
        if (kunci && sudahAda.has(kunci)) continue;
        if (kunci) sudahAda.add(kunci);
        barisSiapInsert.push(l);
      }
    }

    if (!adaSheetValid) {
      return res.status(400).json({
        success: false,
        message:
          "Format file tidak dikenali. Pastikan file memiliki kolom seperti hasil export TUNTAS (Kode Laporan, Uraian Ketidaksesuaian, Penyebab, dst).",
      });
    }
    if (barisSiapInsert.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak ditemukan baris data yang bisa dibaca dari file ini.",
      });
    }

    const connection = await pool.getConnection();
    const fileBaru = [];
    let fileLama = [];

    try {
      await pastikanKolomLampiranArsip(connection); // ALTER = implicit commit, jadi sebelum transaksi

      for (const laporan of barisSiapInsert) {
        laporan.lampiranLaporan = laporan.mediaAwal ? simpanGambarArsip(laporan.mediaAwal) : null;
        laporan.lampiranHasil   = laporan.mediaHasil ? simpanGambarArsip(laporan.mediaHasil) : null;
        if (laporan.lampiranLaporan) fileBaru.push(laporan.lampiranLaporan);
        if (laporan.lampiranHasil) fileBaru.push(laporan.lampiranHasil);
        delete laporan.mediaAwal; delete laporan.mediaHasil;
      }

      await connection.beginTransaction();

      const [lama] = await connection.query(
        `SELECT lampiran_laporan, lampiran_hasil FROM arsip_rekapitulasi WHERE tahun = ?`,
        [tahun]
      );
      fileLama = lama.flatMap((x) => [x.lampiran_laporan, x.lampiran_hasil]).filter(Boolean);

      await connection.query(`DELETE FROM arsip_rekapitulasi WHERE tahun = ?`, [tahun]);

      const sqlInsert = `
        INSERT INTO arsip_rekapitulasi
        (tahun, kode_laporan, jenis_laporan, tgl_masuk, uraian_ketidaksesuaian, unit, penyebab, rencana_tindakan, hasil_tindakan, tgl_pelaksanaan, status_review, status_boxing, lampiran_laporan, lampiran_hasil, nama_file_asal, diupload_oleh)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const l of barisSiapInsert) {
        await connection.query(sqlInsert, [
          l.tahun, potong(l.kode, 50), potong(l.jenis, 50), potong(l.tglMasuk, 50), l.uraian,
          potong(l.unit, 150), l.penyebab, l.rencana, l.hasil, potong(l.tglPelaks, 50),
          potong(l.statusReview, 50), potong(l.statusBoxing, 50),
          l.lampiranLaporan, l.lampiranHasil,
          potong(l.namaFileAsal, 255), l.diuploadOleh,
        ]);
      }
      await connection.commit();
      fileLama.forEach(hapusFileArsip);
    } catch (error) {
      try { await connection.rollback(); } catch {}
      fileBaru.forEach(hapusFileArsip);
      throw error;
    } finally {
      connection.release();
    }

    const jumlahGambar = barisSiapInsert.filter((x) => x.lampiranLaporan).length +
                         barisSiapInsert.filter((x) => x.lampiranHasil).length;
    return res.status(200).json({
      success: true,
      message: `Berhasil mengimpor ${barisSiapInsert.length} baris data arsip tahun ${tahun}` +
        (jumlahGambar > 0 ? ` (termasuk ${jumlahGambar} gambar).` : "."),
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
function bulanDariTeksTanggal(teks) {
  if (!teks) return null;
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(teks);
  if (isoMatch) return parseInt(isoMatch[2], 10);
  const dmyMatch = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(teks);
  if (dmyMatch) return parseInt(dmyMatch[2], 10); // asumsi format dd/mm/yyyy
  const parsed = new Date(teks);
  return isNaN(parsed.getTime()) ? null : parsed.getMonth() + 1;
}

async function getArsipRekap(req, res) {
  try {
    await pastikanKolomLampiranArsip(pool);
    const { tahun, bulan } = req.query;
    let query = `
      SELECT tahun, kode_laporan, jenis_laporan, tgl_masuk, uraian_ketidaksesuaian,
             unit, penyebab, rencana_tindakan, hasil_tindakan, tgl_pelaksanaan,
             status_review, status_boxing, lampiran_laporan, lampiran_hasil
      FROM arsip_rekapitulasi`;
    const params = [];
    if (tahun) {
      query += ` WHERE tahun = ?`;
      params.push(tahun);
    }
    query += ` ORDER BY tahun DESC, tgl_masuk DESC, id_arsip ASC`;

    const [rows] = await pool.query(query, params);

    const bulanInt = bulan ? parseInt(bulan, 10) : null;
    const rowsTerfilter = bulanInt
      ? rows.filter((r) => {
          const b = bulanDariTeksTanggal(r.tgl_pelaksanaan || r.tgl_masuk);
          return b === null || b === bulanInt; // null = gagal parse → fail-open, tetap ikut
        })
      : rows;

    const tahunTersedia = [...new Set(rows.map((r) => r.tahun))].sort((a, b) => b - a);

    return res.status(200).json({ success: true, data: rowsTerfilter, tahunTersedia });
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

    const [fotoLama] = await pool.query(
      `SELECT lampiran_laporan, lampiran_hasil FROM arsip_rekapitulasi WHERE tahun = ?`,
      [tahunInt]
    );
    await pool.query(`DELETE FROM arsip_rekapitulasi WHERE tahun = ?`, [tahunInt]);
    fotoLama.flatMap((x) => [x.lampiran_laporan, x.lampiran_hasil]).filter(Boolean).forEach(hapusFileArsip);

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
//
// ✅ REVISI (permintaan user/dosen):
//   Dua jalur keputusan Ka P4M — 'ditindaklanjuti' (Tindak Lanjut) dan
//   'tidak_ditindaklanjuti' (Sesuai) — sekarang SAMA-SAMA lewat tab
//   "Laporan Hasil" Kepala Unit dulu. Jadi kalau Staf P4M menolak
//   ("Belum Siap"), dua-duanya harus dikembalikan ke "Laporan Hasil"
//   (revisi bukti pelaksanaan), BUKAN ke "Ketidaksesuaian Masuk".
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
      `SELECT b.id_boxing, b.id_laporan, b.status AS status_boxing,
              r.status_review
       FROM boxing_ketidaksesuaian b
       LEFT JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
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
      // ✅ SIAP → Selesai
      await pool.query(
        `UPDATE boxing_ketidaksesuaian
         SET approval_staf = ?, catatan_approval = ?, status = 'selesai'
         WHERE id_boxing = ?`,
        [approval, catatan.trim(), id_boxing]
      );
      await syncStatusLaporan(row.id_laporan);
    } else {
      // ❌ BELUM SIAP → revisi balik ke Laporan Hasil Kepala Unit
      // (untuk KEDUA jalur: 'ditindaklanjuti' maupun 'tidak_ditindaklanjuti').
      await pool.query(
        `UPDATE boxing_ketidaksesuaian
         SET approval_staf = ?, catatan_approval = ?, status = 'menunggu_pelaksanaan'
         WHERE id_boxing = ?`,
        [approval, catatan.trim(), id_boxing]
      );

      // status_review DIBIARKAN seperti semula ('ditindaklanjuti' atau
      // 'tidak_ditindaklanjuti') supaya getLaporanHasil tetap menangkapnya.
      // pelaksanaan_tindakan LAMA TETAP DIPERTAHANKAN agar form revisi
      // terisi otomatis dengan data lama.

      await pool.query(
        `UPDATE laporan_ketidaksesuaian SET status = 'diproses' WHERE id_laporan = ?`,
        [row.id_laporan]
      );
    }

    const pesan =
      approval === "diterima"
        ? "Hasil tindak lanjut unit DITERIMA. Laporan otomatis ditandai SELESAI dan masuk Rekapitulasi."
        : "Hasil tindak lanjut unit DITOLAK oleh Staf P4M. Laporan dikirim kembali ke tab Laporan Hasil Kepala Unit untuk direvisi (Penyebab & Rencana tidak perlu diulang).";

    return res.status(200).json({ success: true, message: pesan });
  } catch (error) {
    console.error("❌ [setApprovalStaf] ERROR:", error);
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