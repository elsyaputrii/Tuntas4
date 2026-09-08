// FILE: backend/utils/kodeLaporan.js
// Generator kode tiket laporan yang ACAK (bukan sequential dari id_laporan).
// Alasan: kode lama (LAP-00001, LAP-00002, dst) gampang dienumerasi lewat
// endpoint publik cek status laporan — orang bisa loop LAP-00001..LAP-99999
// dan baca laporan siapapun. Sekarang kode dibuat dari random bytes dan
// disimpan sebagai kolom asli (`kode_laporan`) di tabel laporan_ketidaksesuaian,
// bukan dihitung ulang dari id_laporan.

const crypto = require("crypto");
const { pool } = require("../config/db");

function randomKode() {
  // 4 byte random → 8 karakter hex, prefix LAP- biar formatnya tetap dikenali user
  return `LAP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

// Generate kode unik (cek ke DB, retry kalau kebetulan bentrok — praktis
// hampir tidak pernah terjadi dengan 4 byte random, tapi tetap dijaga).
async function generateUniqueKodeLaporan(conn = pool) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const kode = randomKode();
    const [rows] = await conn.query(
      `SELECT 1 FROM laporan_ketidaksesuaian WHERE kode_laporan = ? LIMIT 1`,
      [kode]
    );
    if (rows.length === 0) return kode;
  }
  throw new Error("Gagal generate kode_laporan unik setelah beberapa percobaan.");
}

module.exports = { generateUniqueKodeLaporan };
