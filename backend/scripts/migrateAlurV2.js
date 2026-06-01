/**
 * Migrasi alur v2 — aman untuk data enum lama
 * Jalankan: npm run migrate:alur-v2
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { pool } = require("../config/db");

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [cols] = await conn.query(
      `SHOW COLUMNS FROM rancangan_tindakan LIKE 'aksi_masukan'`
    );
    if (cols.length === 0) {
      await conn.query(
        `ALTER TABLE rancangan_tindakan
         ADD COLUMN aksi_masukan TEXT NULL COMMENT 'Masukan Ka P4M' AFTER catatan`
      );
      console.log("+ kolom aksi_masukan");
    } else {
      console.log("= kolom aksi_masukan sudah ada");
    }

    // Langkah 1: ubah ke VARCHAR dulu agar nilai lama tidak error
    await conn.query(
      `ALTER TABLE rancangan_tindakan
       MODIFY status_review VARCHAR(40) NOT NULL DEFAULT 'menunggu_keputusan_ka'`
    );
    console.log("+ status_review → VARCHAR (sementara)");

    const [rancanganMap] = await conn.query(
      `SELECT status_review, COUNT(*) AS cnt FROM rancangan_tindakan GROUP BY status_review`
    );
    console.log("  Nilai status_review saat ini:", rancanganMap);

    await conn.query(
      `UPDATE rancangan_tindakan SET status_review = 'menunggu_keputusan_ka'
       WHERE status_review IN ('menunggu_review', 'revisi', '') OR status_review IS NULL`
    );
    await conn.query(
      `UPDATE rancangan_tindakan SET status_review = 'ditindaklanjuti'
       WHERE status_review IN ('disetujui', 'approved')`
    );
    await conn.query(
      `UPDATE rancangan_tindakan SET status_review = 'tidak_ditindaklanjuti'
       WHERE status_review IN ('tidak_disetujui', 'ditolak', 'rejected')`
    );

    await conn.query(
      `ALTER TABLE rancangan_tindakan
       MODIFY status_review ENUM('menunggu_keputusan_ka','ditindaklanjuti','tidak_ditindaklanjuti')
       NOT NULL DEFAULT 'menunggu_keputusan_ka'`
    );
    console.log("+ status_review → ENUM baru");

    await conn.query(
      `ALTER TABLE boxing_ketidaksesuaian
       MODIFY status VARCHAR(30) NOT NULL DEFAULT 'terdistribusi'`
    );
    console.log("+ boxing.status → VARCHAR (sementara)");

    const [boxingMap] = await conn.query(
      `SELECT status, COUNT(*) AS cnt FROM boxing_ketidaksesuaian GROUP BY status`
    );
    console.log("  Nilai boxing.status saat ini:", boxingMap);

    // Mapping status boxing berdasarkan rancangan & pelaksanaan
    await conn.query(
      `UPDATE boxing_ketidaksesuaian b
       JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
       SET b.status = 'menunggu_pelaksanaan'
       WHERE r.status_review = 'ditindaklanjuti'
         AND b.status IN ('diproses', 'selesai', 'terdistribusi')
         AND NOT EXISTS (SELECT 1 FROM pelaksanaan_tindakan p WHERE p.id_boxing = b.id_boxing)`
    );

    await conn.query(
      `UPDATE boxing_ketidaksesuaian b
       JOIN pelaksanaan_tindakan p ON p.id_boxing = b.id_boxing
       SET b.status = 'di_staff'
       WHERE b.status IN ('selesai', 'diproses', 'terdistribusi')`
    );

    await conn.query(
      `UPDATE boxing_ketidaksesuaian b
       JOIN rancangan_tindakan r ON r.id_boxing = b.id_boxing
       SET b.status = 'di_staff'
       WHERE r.status_review = 'tidak_ditindaklanjuti'
         AND b.status NOT IN ('selesai')`
    );

    await conn.query(
      `UPDATE boxing_ketidaksesuaian SET status = 'terdistribusi'
       WHERE status NOT IN (
         'terdistribusi','diproses','menunggu_pelaksanaan','di_staff','selesai'
       ) OR status = '' OR status IS NULL`
    );

    await conn.query(
      `ALTER TABLE boxing_ketidaksesuaian
       MODIFY status ENUM('terdistribusi','diproses','menunggu_pelaksanaan','di_staff','selesai')
       NOT NULL DEFAULT 'terdistribusi'`
    );
    console.log("+ boxing.status → ENUM baru");

    await conn.commit();

    const [cekR] = await conn.query(
      `SELECT status_review, COUNT(*) AS cnt FROM rancangan_tindakan GROUP BY status_review`
    );
    const [cekB] = await conn.query(
      `SELECT status, COUNT(*) AS cnt FROM boxing_ketidaksesuaian GROUP BY status`
    );

    console.log("\nMigrasi alur v2 SELESAI.");
    console.log("rancangan_tindakan:", cekR);
    console.log("boxing_ketidaksesuaian:", cekB);
  } catch (err) {
    await conn.rollback();
    console.error("Migrasi gagal:", err.message);
    process.exit(1);
  } finally {
    conn.release();
    pool.end();
  }
}

run();
