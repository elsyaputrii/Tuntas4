// FILE: backend/utils/notifikasi.js
//
// Helper terpusat untuk notifikasi in-app (tabel `notifikasi`, muncul di
// lonceng 🔔 tiap dashboard) SEKALIGUS email (pakai Gmail).
//
// PENTING: semua fungsi di sini sengaja TIDAK melempar error ke pemanggil.
// Gagal kirim notifikasi/email tidak boleh bikin proses utama ikut gagal.

const nodemailer = require("nodemailer");
const { pool } = require("../config/db");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ============================================================
// KONFIGURASI
// ============================================================
// Alamat aplikasi yang bisa dibuka penerima email (BUKAN localhost)
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");

if (/localhost|127\.0\.0\.1/.test(FRONTEND_URL)) {
  console.warn(
    "⚠️  FRONTEND_URL masih localhost. Tombol di email tidak akan bisa dibuka orang lain."
  );
}

// Mode uji coba: email HANYA dikirim ke alamat di EMAIL_ALLOWLIST.
// Kalau EMAIL_TEST_MODE=false, email dikirim ke semua akun seperti biasa.
const EMAIL_TEST_MODE = process.env.EMAIL_TEST_MODE === "true";
const EMAIL_ALLOWLIST = (process.env.EMAIL_ALLOWLIST || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (EMAIL_TEST_MODE) {
  console.warn(
    `⚠️  EMAIL_TEST_MODE aktif: email hanya dikirim ke: ${EMAIL_ALLOWLIST.join(", ") || "(kosong)"}`
  );
}

// ============================================================
// KIRIM EMAIL (dipanggil internal, tidak melempar error)
// ============================================================
async function kirimEmail(to, judul, pesan, link) {
  if (!to) return;

  let subject = judul;

  if (EMAIL_TEST_MODE) {
    if (!EMAIL_ALLOWLIST.includes(String(to).toLowerCase())) {
      console.log(`[TEST MODE] Email ke ${to} dilewati (tidak ada di EMAIL_ALLOWLIST).`);
      return;
    }
    subject = `[UJI COBA] ${judul}`;
  }

  const url = link ? `${FRONTEND_URL}${link.startsWith("/") ? link : "/" + link}` : null;

  try {
    await transporter.sendMail({
      from: `"TUNTAS4 - P4M Polibatam" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #18253d;">${judul}</h2>
          <p style="font-size: 14px; color: #333;">${pesan}</p>
          ${
            url
              ? `<p><a href="${url}" style="display:inline-block; margin-top:12px; padding:10px 18px; background:#18253d; color:#fff; text-decoration:none; border-radius:8px;">Buka di TUNTAS4</a></p>`
              : ""
          }
          <p style="font-size: 12px; color: #888; margin-top: 24px;">
            Email ini dikirim otomatis oleh sistem TUNTAS4, mohon tidak dibalas.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("❌ Gagal kirim email notifikasi:", error.message);
  }
}

// ============================================================
// BUAT 1 NOTIFIKASI untuk 1 akun (id_pengguna sudah diketahui)
// ============================================================
async function notifikasiUntukPengguna(id_pengguna, { judul, pesan, jenis, link }) {
  if (!id_pengguna) return;

  try {
    await pool.query(
      `INSERT INTO notifikasi (id_pengguna, judul, pesan, jenis, link)
       VALUES (?, ?, ?, ?, ?)`,
      [id_pengguna, judul, pesan, jenis, link || null]
    );

    const [rows] = await pool.query(
      `SELECT email FROM pengguna WHERE id_pengguna = ?`,
      [id_pengguna]
    );
    if (rows.length > 0) {
      kirimEmail(rows[0].email, judul, pesan, link);
    }
  } catch (error) {
    console.error("❌ Gagal buat notifikasi (per pengguna):", error.message);
  }
}

// ============================================================
// BUAT NOTIFIKASI untuk SEMUA akun dengan role tertentu
// ============================================================
async function notifikasiUntukRole(role, { judul, pesan, jenis, link }) {
  try {
    const [users] = await pool.query(
      `SELECT id_pengguna, email FROM pengguna WHERE role = ?`,
      [role]
    );

    if (users.length === 0) return;

    const values = users.map((u) => [u.id_pengguna, judul, pesan, jenis, link || null]);
    await pool.query(
      `INSERT INTO notifikasi (id_pengguna, judul, pesan, jenis, link) VALUES ?`,
      [values]
    );

    for (const u of users) {
      kirimEmail(u.email, judul, pesan, link);
    }
  } catch (error) {
    console.error("❌ Gagal buat notifikasi (per role):", error.message);
  }
}

module.exports = {
  notifikasiUntukPengguna,
  notifikasiUntukRole,
};