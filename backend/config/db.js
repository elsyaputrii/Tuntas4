// ============================================================
// FILE: config/db.js
// Mengatur koneksi ke database MySQL
// ============================================================

const mysql = require("mysql2/promise");
require("dotenv").config();

// ============================================================
// MEMBUAT POOL KONEKSI
// ============================================================
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // Gunakan WIB
  timezone: "+07:00",

  // Kolom DATE dikembalikan sebagai string YYYY-MM-DD
  dateStrings: ["DATE"],
});

// ============================================================
// SET TIMEZONE SESSION MYSQL
//
// PENTING:
// Walaupun menggunakan mysql2/promise, connection yang diterima
// dari event "connection" menggunakan query callback-style.
// Jadi JANGAN pakai .catch() di sini.
// ============================================================
pool.on("connection", (connection) => {
  connection.query(
    "SET time_zone = '+07:00'",
    (err) => {
      if (err) {
        console.error(
          "⚠️ Gagal SET time_zone di koneksi MySQL:",
          err.message
        );
      }
    }
  );
});

// ============================================================
// FUNGSI TEST KONEKSI
// ============================================================
async function testConnection() {
  try {
    const connection = await pool.getConnection();

    console.log("✅ Koneksi ke database MySQL berhasil!");

    // Kembalikan koneksi ke pool
    connection.release();
  } catch (error) {
    console.error(
      "❌ Gagal koneksi ke database:",
      error.message
    );

    console.error(
      "   Cek kembali isi DB_HOST, DB_USER, DB_PASSWORD di file .env"
    );

    process.exit(1);
  }
}

// ============================================================
// EXPORT
// ============================================================
module.exports = {
  pool,
  testConnection,
};