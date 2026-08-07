// FILE: backend/utils/notifikasi.js
//
// Helper terpusat untuk notifikasi in-app (tabel `notifikasi`, muncul di
// lonceng 🔔 tiap dashboard) SEKALIGUS email (pakai Gmail, sama seperti
// yang dipakai fitur lupa password).
//
// Dipanggil dari controller di titik-titik "serah terima" laporan:
//   civitas → staf_p4m → kepala_unit → ka_p4m (dan sebaliknya pas keputusan).
//
// PENTING: semua fungsi di sini sengaja TIDAK melempar error ke pemanggil.
// Gagal kirim notifikasi/email tidak boleh bikin proses utama (simpan
// laporan, distribusi, dst) ikut gagal — cuma di-log ke console.

const nodemailer = require("nodemailer");
const { pool } = require("../config/db");

// ============================================================
// SETUP NODEMAILER — sama seperti forgotPasswordController.js
// ============================================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ============================================================
// KIRIM EMAIL (dipanggil internal, tidak melempar error)
// ============================================================
async function kirimEmail(to, judul, pesan, link) {
  if (!to) return;

  const url = link ? `${FRONTEND_URL}${link}` : null;

  try {
    await transporter.sendMail({
      from: `"TUNTAS4 - P4M Polibatam" <${process.env.EMAIL_USER}>`,
      to,
      subject: judul,
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
// Simpan ke DB dulu, baru kirim email (email tidak menunggu/blocking).
// ============================================================
async function notifikasiUntukPengguna(id_pengguna, { judul, pesan, jenis, link }) {
  if (!id_pengguna) return;

  try {
    await pool.query(
      `INSERT INTO notifikasi (id_pengguna, judul, pesan, jenis, link)
       VALUES (?, ?, ?, ?, ?)`,
      [id_pengguna, judul, pesan, jenis, link || null]
    );

    // Ambil email pemilik akun, lalu kirim (tidak di-await supaya request
    // utama tidak nunggu proses kirim email selesai).
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
// Contoh: laporan baru dari civitas → semua akun staf_p4m dikasih tau.
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