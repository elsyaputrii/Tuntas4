// FILE: backend/controllers/forgotPasswordController.js
// Menangani 2 fungsi:
//   1. requestReset  → kirim link reset ke email user
//   2. resetPassword → validasi token & update password baru

const crypto     = require("crypto");
const nodemailer = require("nodemailer");
const bcrypt     = require("bcryptjs");
const { pool }   = require("../config/db");

// ============================================================
// SETUP NODEMAILER (pengirim email)
// Gunakan Gmail dengan App Password
// ============================================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Mapping role DB → bagian URL frontend
const roleToUrlMap = {
  staf_p4m:    "staff-p4m",
  ka_p4m:      "ka-p4m",
  kepala_unit: "kepala-unit",
};

// ============================================================
// 1. REQUEST RESET — POST /api/auth/forgot-password
//    User kirim email + role → sistem cek, buat token, kirim email
//    Body: { email, role }
// ============================================================
async function requestReset(req, res) {
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({
      success: false,
      message: "Email dan role wajib diisi.",
    });
  }

  const roleValid = ["staf_p4m", "ka_p4m", "kepala_unit"];
  if (!roleValid.includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Role tidak valid.",
    });
  }

  try {
    // Cari user berdasarkan email + role (keamanan: role harus cocok)
    const [rows] = await pool.query(
      `SELECT id_pengguna, nama, email, role
       FROM pengguna
       WHERE email = ? AND role = ?
       LIMIT 1`,
      [email, role]
    );

    // Selalu jawab sukses meski email tidak ditemukan
    // → mencegah orang tahu apakah email terdaftar atau tidak
    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Jika email terdaftar, link reset akan dikirim.",
      });
    }

    const user = rows[0];

    // Buat token acak 32 byte → 64 karakter hex
    const token     = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

    // Hapus token lama milik user ini (kalau ada)
    await pool.query(
      `DELETE FROM password_reset_tokens WHERE id_pengguna = ?`,
      [user.id_pengguna]
    );

    // Simpan token baru ke database
    await pool.query(
      `INSERT INTO password_reset_tokens (id_pengguna, token, expires_at)
       VALUES (?, ?, ?)`,
      [user.id_pengguna, token, expiresAt]
    );

    // Buat URL reset sesuai role
    const roleUrl  = roleToUrlMap[role] || "staff-p4m";
    const resetUrl = `${process.env.FRONTEND_URL}/${roleUrl}/reset-password?token=${token}`;

    // Kirim email
    await transporter.sendMail({
      from:    `"TUNTAS Polibatam" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: "Reset Password — TUNTAS Polibatam",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background-color: #4d5e71; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0; font-size: 22px;">
              Reset Password TUNTAS Polibatam
            </h2>
          </div>
          <div style="background-color: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
            <p style="color: #333; font-size: 15px;">Halo, <strong>${user.nama}</strong></p>
            <p style="color: #555; font-size: 14px;">
              Kami menerima permintaan reset password untuk akun Anda.
              Klik tombol di bawah ini untuk membuat password baru:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetUrl}"
                 style="background-color: #5da0dd; color: white; padding: 13px 32px;
                        text-decoration: none; border-radius: 25px; font-weight: bold;
                        font-size: 15px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #888; font-size: 13px;">
              Link ini akan kadaluwarsa dalam <strong>1 jam</strong>.
            </p>
            <p style="color: #888; font-size: 13px;">
              Jika Anda tidak merasa meminta reset password, abaikan email ini.
            </p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
            <p style="color: #aaa; font-size: 12px; margin: 0;">
              Tim TUNTAS — Politeknik Negeri Batam
            </p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Link reset password berhasil dikirim. Cek email Anda.",
    });
  } catch (error) {
    console.error("Error requestReset:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengirim email. Coba lagi nanti.",
    });
  }
}

// ============================================================
// 2. RESET PASSWORD — POST /api/auth/reset-password
//    User kirim token + password baru → validasi & update
//    Body: { token, newPassword, confirmPassword }
// ============================================================
async function resetPassword(req, res) {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Token dan password baru wajib diisi.",
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Konfirmasi password tidak cocok.",
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password minimal 8 karakter.",
    });
  }

  try {
    // Cari token di database
    const [rows] = await pool.query(
      `SELECT id, id_pengguna, expires_at, used
       FROM password_reset_tokens
       WHERE token = ?
       LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Token tidak valid atau sudah dihapus.",
      });
    }

    const resetToken = rows[0];

    // Cek sudah dipakai
    if (resetToken.used) {
      return res.status(400).json({
        success: false,
        message: "Token sudah pernah digunakan.",
      });
    }

    // Cek kadaluwarsa
    if (new Date() > new Date(resetToken.expires_at)) {
      return res.status(400).json({
        success: false,
        message: "Token sudah kadaluwarsa. Silakan minta link baru.",
      });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password di tabel pengguna
    await pool.query(
      `UPDATE pengguna SET password = ? WHERE id_pengguna = ?`,
      [hashedPassword, resetToken.id_pengguna]
    );

    // Tandai token sebagai sudah digunakan
    await pool.query(
      `UPDATE password_reset_tokens SET used = 1 WHERE token = ?`,
      [token]
    );

    return res.status(200).json({
      success: true,
      message: "Password berhasil diubah! Silakan login.",
    });
  } catch (error) {
    console.error("Error resetPassword:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengubah password. Coba lagi.",
    });
  }
}

module.exports = { requestReset, resetPassword };