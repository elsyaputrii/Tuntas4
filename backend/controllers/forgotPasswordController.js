// FILE: backend/controllers/forgotPasswordController.js
// Menangani alur lupa password:
//   1. requestReset  → user input email → generate token
//   2. resetPassword → user input password baru dengan token

const bcrypt   = require("bcryptjs");
const crypto   = require("crypto"); // built-in Node.js, tidak perlu install
const { pool } = require("../config/db");

// ============================================================
// 1. REQUEST RESET PASSWORD
//    POST /api/forgot-password/request
//    Body: { email, role }
//
//    Alur:
//      a. Cek email ada di DB dan rolenya cocok
//      b. Generate token acak
//      c. Simpan token + waktu kadaluarsa (1 jam) ke DB
//      d. Return reset link (di production: kirim via email)
// ============================================================
async function requestReset(req, res) {
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({
      success: false,
      message: "Email dan role wajib diisi.",
    });
  }

  try {
    // Cek apakah email ada dan rolenya sesuai
    const [rows] = await pool.query(
      `SELECT id_pengguna, nama, email, role
       FROM pengguna
       WHERE email = ? AND role = ?
       LIMIT 1`,
      [email, role]
    );

    // Selalu return success meskipun email tidak ada
    // (untuk keamanan — tidak memberitahu apakah email terdaftar)
    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Jika email terdaftar, link reset akan dikirimkan.",
      });
    }

    const user = rows[0];

    // Generate token acak 32 byte → ubah ke hex string (64 karakter)
    const token   = crypto.randomBytes(32).toString("hex");

    // Token berlaku 1 jam dari sekarang
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // Simpan token ke database
    await pool.query(
      `UPDATE pengguna
       SET reset_token = ?, reset_token_expires = ?
       WHERE id_pengguna = ?`,
      [token, expires, user.id_pengguna]
    );

    // URL reset — di production kirim via email
    // Di sini kita return langsung untuk testing
    const resetUrl = `http://localhost:3000/staff-p4m/reset-password?token=${token}`;

    return res.status(200).json({
      success: true,
      message: "Link reset password berhasil dibuat.",
      // Di production hapus reset_url dari response — kirim via email
      // Untuk development/testing, tampilkan di sini
      data: {
        reset_url: resetUrl,
        nama:      user.nama,
        expires:   expires,
      },
    });
  } catch (error) {
    console.error("Error requestReset:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server.",
    });
  }
}

// ============================================================
// 2. RESET PASSWORD
//    POST /api/forgot-password/reset
//    Body: { token, password_baru, konfirmasi_password }
//
//    Alur:
//      a. Cek token valid dan belum kadaluarsa
//      b. Hash password baru
//      c. Update password di DB
//      d. Hapus token dari DB
// ============================================================
async function resetPassword(req, res) {
  const { token, password_baru, konfirmasi_password } = req.body;

  if (!token || !password_baru || !konfirmasi_password) {
    return res.status(400).json({
      success: false,
      message: "Token, password baru, dan konfirmasi password wajib diisi.",
    });
  }

  // Validasi password sama
  if (password_baru !== konfirmasi_password) {
    return res.status(400).json({
      success: false,
      message: "Password baru dan konfirmasi password tidak sama.",
    });
  }

  // Validasi panjang password minimal 6 karakter
  if (password_baru.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password minimal 6 karakter.",
    });
  }

  try {
    // Cari user berdasarkan token yang belum kadaluarsa
    const [rows] = await pool.query(
      `SELECT id_pengguna, nama, reset_token_expires
       FROM pengguna
       WHERE reset_token = ?
       LIMIT 1`,
      [token]
    );

    // Token tidak ditemukan
    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Token tidak valid. Silakan minta link reset baru.",
      });
    }

    const user = rows[0];

    // Cek apakah token sudah kadaluarsa
    const sekarang = new Date();
    const expires  = new Date(user.reset_token_expires);

    if (sekarang > expires) {
      return res.status(400).json({
        success: false,
        message: "Token sudah kadaluarsa. Silakan minta link reset baru.",
      });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(password_baru, 10);

    // Update password + hapus token
    await pool.query(
      `UPDATE pengguna
       SET password            = ?,
           reset_token         = NULL,
           reset_token_expires = NULL
       WHERE id_pengguna = ?`,
      [hashedPassword, user.id_pengguna]
    );

    return res.status(200).json({
      success: true,
      message: "Password berhasil diubah! Silakan login dengan password baru.",
    });
  } catch (error) {
    console.error("Error resetPassword:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server.",
    });
  }
}

// ============================================================
// 3. CEK TOKEN VALID (opsional — dipakai frontend sebelum tampil form)
//    GET /api/forgot-password/cek-token?token=xxx
// ============================================================
async function cekToken(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ success: false, message: "Token wajib diisi." });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id_pengguna, reset_token_expires
       FROM pengguna
       WHERE reset_token = ?
       LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "Token tidak valid." });
    }

    const expires  = new Date(rows[0].reset_token_expires);
    const sekarang = new Date();

    if (sekarang > expires) {
      return res.status(400).json({ success: false, message: "Token sudah kadaluarsa." });
    }

    return res.status(200).json({ success: true, message: "Token valid." });
  } catch (error) {
    console.error("Error cekToken:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
}

module.exports = { requestReset, resetPassword, cekToken };