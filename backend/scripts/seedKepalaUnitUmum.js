/**
 * Seed akun Kepala Unit untuk setiap unit bagian Umum.
 * Jalankan: node scripts/seedKepalaUnitUmum.js
 *
 * Password default (sama dengan akun demo lain): password123
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const { UNITS_UMUM } = require("../constants/unitsUmum");

const DEFAULT_PASSWORD = "password123";

function unitToEmailSlug(unit) {
  return unit
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function unitToNama(unit) {
  return `Kepala Unit ${unit}`;
}

async function seed() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < UNITS_UMUM.length; i++) {
      const unit = UNITS_UMUM[i];

      const [existing] = await conn.query(
        `SELECT id_kepala FROM kepala_unit WHERE unit = ? LIMIT 1`,
        [unit]
      );

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const slug = unitToEmailSlug(unit);
      const email = slug === "sbak" ? "kaunit@polibatam.ac.id" : `kaunit.${slug}@polibatam.ac.id`;
      const nip = `1985010120100${String(11001 + i).padStart(5, "0")}`.slice(0, 20);

      const [penggunaResult] = await conn.query(
        `INSERT INTO pengguna (nama, email, password, role, nip)
         VALUES (?, ?, ?, 'kepala_unit', ?)`,
        [unitToNama(unit), email, passwordHash, nip]
      );

      await conn.query(
        `INSERT INTO kepala_unit (id_pengguna, nama, nip, unit)
         VALUES (?, ?, ?, ?)`,
        [penggunaResult.insertId, unitToNama(unit), nip, unit]
      );

      created++;
      console.log(`  + ${unit} → ${email}`);
    }

    // Backfill id_kepala pada distribusi lama yang masih NULL
    const [backfill] = await conn.query(
      `UPDATE boxing_ketidaksesuaian b
       JOIN kepala_unit k ON k.unit = b.unit_tujuan
       SET b.id_kepala = k.id_kepala
       WHERE b.id_kepala IS NULL AND b.unit_tujuan IN (?)`,
      [UNITS_UMUM]
    );

    await conn.commit();

    console.log("\nSelesai.");
    console.log(`  Akun baru     : ${created}`);
    console.log(`  Sudah ada     : ${skipped}`);
    console.log(`  Boxing diperbaiki: ${backfill.affectedRows} baris`);
    console.log(`  Password demo : ${DEFAULT_PASSWORD}`);
  } catch (err) {
    await conn.rollback();
    console.error("Gagal seed:", err.message);
    process.exit(1);
  } finally {
    conn.release();
    pool.end();
  }
}

seed();
