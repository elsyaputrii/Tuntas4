// FILE: backend/controllers/authController.js
// Login TERPISAH per role — tiap role punya endpoint sendiri
// Sehingga staf tidak bisa login lewat endpoint ka_p4m, dst

const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");
const { pool }  = require("../config/db");

// ============================================================
// FUNGSI PEMBANTU: buat token JWT
// Dipanggil oleh semua fungsi login di bawah
// ============================================================
function buatToken(user) {
  return jwt.sign(
    {
      id:   user.id_pengguna,
      nama: user.nama,
      role: user.role,
      nip:  user.nip,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );
}

// ============================================================
// FUNGSI PEMBANTU: cek email + password + role
// Kalau role tidak cocok → tolak meskipun password benar
// ============================================================
async function cekKredensial(email, password, roleDiharapkan, res) {
  // Cari user berdasarkan email
  const [rows] = await pool.query(
    `SELECT id_pengguna, nama, email, password, role, nip
     FROM pengguna WHERE email = ? LIMIT 1`,
    [email]
  );

  // Email tidak ditemukan
  if (rows.length === 0) {
    res.status(401).json({
      success: false,
      message: "Email atau password salah.",
    });
    return null;
  }

  const user = rows[0];

  // Cek password
  const passwordCocok = await bcrypt.compare(password, user.password);
  if (!passwordCocok) {
    res.status(401).json({
      success: false,
      message: "Email atau password salah.",
    });
    return null;
  }

  // Cek apakah role cocok dengan endpoint yang diakses
  if (user.role !== roleDiharapkan) {
    res.status(403).json({
      success: false,
      message: `Akun ini bukan ${roleDiharapkan.replace("_", " ")}. Gunakan halaman login yang sesuai.`,
    });
    return null;
  }

  return user;
}

// ============================================================
// LOGIN STAF P4M
// POST /api/auth/staf/login
// Hanya menerima akun dengan role = staf_p4m
// ============================================================
async function loginStaf(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email dan password wajib diisi.",
    });
  }

  try {
    const user = await cekKredensial(email, password, "staf_p4m", res);
    if (!user) return; // sudah kirim response di dalam cekKredensial

    // Ambil id_staf dari tabel staf_p4m
    const [stafRows] = await pool.query(
      `SELECT id_staf FROM staf_p4m WHERE id_pengguna = ?`,
      [user.id_pengguna]
    );
    const id_staf = stafRows[0]?.id_staf || null;

    const token = buatToken(user);

    return res.status(200).json({
      success: true,
      message: `Selamat datang, ${user.nama}!`,
      data: {
        token,
        user: {
          id:      user.id_pengguna,
          id_staf,
          nama:    user.nama,
          email:   user.email,
          role:    user.role,
          nip:     user.nip,
        },
      },
    });
  } catch (error) {
    console.error("Error loginStaf:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
}

// ============================================================
// LOGIN KA P4M
// POST /api/auth/kap4m/login
// Hanya menerima akun dengan role = ka_p4m
// ============================================================
async function loginKaP4M(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email dan password wajib diisi.",
    });
  }

  try {
    const user = await cekKredensial(email, password, "ka_p4m", res);
    if (!user) return;

    // Ambil id_ka dari tabel ka_p4m
    const [kaRows] = await pool.query(
      `SELECT id_ka FROM ka_p4m WHERE id_pengguna = ?`,
      [user.id_pengguna]
    );
    const id_ka = kaRows[0]?.id_ka || null;

    const token = buatToken(user);

    return res.status(200).json({
      success: true,
      message: `Selamat datang, ${user.nama}!`,
      data: {
        token,
        user: {
          id:    user.id_pengguna,
          id_ka,
          nama:  user.nama,
          email: user.email,
          role:  user.role,
          nip:   user.nip,
        },
      },
    });
  } catch (error) {
    console.error("Error loginKaP4M:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
}

// ============================================================
// LOGIN KEPALA UNIT
// POST /api/auth/kepala-unit/login
// Hanya menerima akun dengan role = kepala_unit
// ============================================================
async function loginKepalaUnit(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email dan password wajib diisi.",
    });
  }

  try {
    const user = await cekKredensial(email, password, "kepala_unit", res);
    if (!user) return;

    // Ambil id_kepala + unit dari tabel kepala_unit
    const [kepalaRows] = await pool.query(
      `SELECT id_kepala, unit FROM kepala_unit WHERE id_pengguna = ?`,
      [user.id_pengguna]
    );
    const id_kepala = kepalaRows[0]?.id_kepala || null;
    const unit      = kepalaRows[0]?.unit      || null;

    const token = buatToken(user);

    return res.status(200).json({
      success: true,
      message: `Selamat datang, ${user.nama}!`,
      data: {
        token,
        user: {
          id:         user.id_pengguna,
          id_kepala,
          unit,
          nama:       user.nama,
          email:      user.email,
          role:       user.role,
          nip:        user.nip,
        },
      },
    });
  } catch (error) {
    console.error("Error loginKepalaUnit:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
}

// ============================================================
// CEK TOKEN — GET /api/auth/me
// Dipakai frontend untuk cek apakah token masih berlaku
// ============================================================
async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    data: req.user, // sudah diisi authMiddleware
  });
}

module.exports = { loginStaf, loginKaP4M, loginKepalaUnit, getMe };