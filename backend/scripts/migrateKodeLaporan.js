/**
 * Migrasi: kode_laporan acak (anti-enumerasi)
 * Menambah kolom `kode_laporan` di laporan_ketidaksesuaian, mengisi token
 * acak untuk baris yang sudah ada, lalu mengunci kolomnya jadi NOT NULL + UNIQUE.
 *
 * Jalankan: npm run migrate:kode-laporan
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const crypto = require("crypto");
const { pool } = require("../config/db");

// Format: LAP- + 8 karakter hex uppercase (4 byte random ≈ 4 miliar kombinasi)
function generateKodeLaporan() {
  return `LAP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

async function run() {
  const conn = await pool.getConnection();
  try {
    const [cols] = await conn.query(
      `SHOW COLUMNS FROM laporan_ketidaksesuaian LIKE 'kode_laporan'`
    );
    if (cols.length === 0) {
      await conn.query(
        `ALTER TABLE laporan_ketidaksesuaian
         ADD COLUMN kode_laporan VARCHAR(20) NULL AFTER id_laporan`
      );
      console.log("+ kolom kode_laporan ditambahkan");
    } else {
      console.log("= kolom kode_laporan sudah ada");
    }

    const [rows] = await conn.query(
      `SELECT id_laporan FROM laporan_ketidaksesuaian WHERE kode_laporan IS NULL OR kode_laporan = ''`
    );
    console.log(`  ${rows.length} baris belum punya kode_laporan, generate token...`);

    for (const row of rows) {
      // Retry kalau kebetulan tabrakan (praktis mustahil, tapi jaga-jaga)
      let kode, unique = false;
      for (let attempt = 0; attempt < 5 && !unique; attempt++) {
        kode = generateKodeLaporan();
        const [exists] = await conn.query(
          `SELECT 1 FROM laporan_ketidaksesuaian WHERE kode_laporan = ? LIMIT 1`,
          [kode]
        );
        unique = exists.length === 0;
      }
      if (!unique) throw new Error(`Gagal generate kode unik untuk id_laporan=${row.id_laporan}`);
      await conn.query(
        `UPDATE laporan_ketidaksesuaian SET kode_laporan = ? WHERE id_laporan = ?`,
        [kode, row.id_laporan]
      );
    }
    console.log("+ backfill kode_laporan selesai");

    const [dup] = await conn.query(
      `SELECT kode_laporan, COUNT(*) c FROM laporan_ketidaksesuaian
       GROUP BY kode_laporan HAVING c > 1`
    );
    if (dup.length > 0) {
      throw new Error(`Ditemukan kode_laporan duplikat: ${JSON.stringify(dup)}`);
    }

    const [uqExists] = await conn.query(
      `SELECT 1 FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'laporan_ketidaksesuaian'
         AND INDEX_NAME = 'uq_kode_laporan'`
    );
    await conn.query(
      `ALTER TABLE laporan_ketidaksesuaian MODIFY kode_laporan VARCHAR(20) NOT NULL`
    );
    if (uqExists.length === 0) {
      await conn.query(
        `ALTER TABLE laporan_ketidaksesuaian ADD UNIQUE KEY uq_kode_laporan (kode_laporan)`
      );
      console.log("+ kode_laporan dikunci NOT NULL + UNIQUE");
    } else {
      console.log("= UNIQUE key kode_laporan sudah ada");
    }

    console.log("\nMigrasi kode_laporan SELESAI.");
  } catch (err) {
    console.error("Migrasi gagal:", err.message);
    process.exit(1);
  } finally {
    conn.release();
    pool.end();
  }
}

run();
