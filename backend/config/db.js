// ============================================================
// FILE: config/db.js
// Mengatur koneksi ke database MySQL
// ============================================================

const mysql = require("mysql2/promise");
require("dotenv").config();

// ============================================================
// MEMBUAT POOL KONEKSI
//
// Pool = kumpulan koneksi yang sudah siap dipakai.
// Analoginya seperti antrian kasir di supermarket —
// daripada buka kasir baru setiap ada pembeli (lambat),
// lebih baik sediakan beberapa kasir sekaligus (efisien).
//
// Jadi setiap kali ada request masuk, backend tidak perlu
// buat koneksi baru dari nol ke MySQL, cukup ambil koneksi
// yang sudah tersedia di pool.
// ============================================================
const pool = mysql.createPool({
  host:     process.env.DB_HOST,      // dari .env: localhost
  port:     process.env.DB_PORT,      // dari .env: 3306
  user:     process.env.DB_USER,      // dari .env: root
  password: process.env.DB_PASSWORD,  // dari .env: password kamu
  database: process.env.DB_NAME,      // dari .env: tuntas4

  waitForConnections: true,  // tunggu jika semua koneksi sedang dipakai
  connectionLimit: 10,       // maksimal 10 koneksi bersamaan
  queueLimit: 0,             // antrian tidak dibatasi (0 = unlimited)
});

// ============================================================
// FUNGSI TEST KONEKSI
// Dipanggil saat server pertama kali dinyalakan.
// Tujuannya: pastikan database bisa diakses sebelum
// menerima request dari user.
// ============================================================
async function testConnection() {
  try {
    // Coba ambil 1 koneksi dari pool
    const connection = await pool.getConnection();
    console.log("✅ Koneksi ke database MySQL berhasil!");
    // Kembalikan koneksi ke pool setelah selesai dipakai
    connection.release();
  } catch (error) {
    console.error("❌ Gagal koneksi ke database:", error.message);
    console.error("   Cek kembali isi DB_HOST, DB_USER, DB_PASSWORD di file .env");
    process.exit(1); // hentikan server jika database tidak bisa diakses
  }
}

// Export pool dan testConnection agar bisa dipakai di file lain
module.exports = { pool, testConnection };