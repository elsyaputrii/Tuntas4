// FILE: config/db.js
const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+07:00",
  dateStrings: ["DATE"],

  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
});

pool.on("error", (err) => {
  console.error("⚠️ MySQL pool error:", err.code || err.message);
});

pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+07:00'", (err) => {
    if (err) console.error("⚠️ Gagal SET time_zone di koneksi MySQL:", err.message);
  });
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Koneksi ke database MySQL berhasil!");
    connection.release();
  } catch (error) {
    console.error("❌ Gagal koneksi ke database:", error.message);
    console.error("   Cek kembali isi DB_HOST, DB_USER, DB_PASSWORD di file .env");
    process.exit(1);
  }
}

module.exports = { pool, testConnection };