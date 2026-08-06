// FILE: backend/controllers/userController.js
// CRUD akun untuk halaman "Data Akun" (Staf P4M) — kelola Staff P4M,
// Kepala Unit, dan KA-P4M.
//
// CATATAN MAPPING ROLE:
// Tabel `pengguna.role` pakai enum: 'staf_p4m' | 'ka_p4m' | 'kepala_unit' | 'civitas'
// Frontend (data-akun) pakai key:   'staff_p4m' | 'ka_p4m' | 'kepala_unit'
// (beda 1 huruf 'f' di staf/staff) → di-mapping di sini biar konsisten.
//
// Data profil (nama, nip, no_telp, unit) disimpan terpisah per role di
// tabel staf_p4m / kepala_unit / ka_p4m, masing-masing terhubung lewat
// pengguna.id_pengguna.

const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";

const ROLE_FE_TO_DB = { staff_p4m: "staf_p4m", kepala_unit: "kepala_unit", ka_p4m: "ka_p4m" };
const ROLE_DB_TO_FE = { staf_p4m: "staff_p4m", kepala_unit: "kepala_unit", ka_p4m: "ka_p4m" };

function generateNip() {
  // NIP sementara kalau user gak isi (biar gak bentrok UNIQUE constraint)
  return `TMP-${Date.now()}`;
}

// ── GET /api/users — list semua akun (gabungan 3 role) ──────────────
async function getUsers(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
        p.id_pengguna AS id,
        p.nama        AS name,
        p.email       AS email,
        p.role        AS role,
        p.status      AS status,
        p.tanda_tangan AS tandaTangan,
        p.created_at  AS createdAt,
        COALESCE(s.nip, k.nip, kp.nip)         AS nip,
        COALESCE(s.no_telp, '')                AS phone,
        COALESCE(k.unit, '')                   AS unit
      FROM pengguna p
      LEFT JOIN staf_p4m    s  ON s.id_pengguna  = p.id_pengguna AND p.role = 'staf_p4m'
      LEFT JOIN kepala_unit k  ON k.id_pengguna  = p.id_pengguna AND p.role = 'kepala_unit'
      LEFT JOIN ka_p4m      kp ON kp.id_pengguna = p.id_pengguna AND p.role = 'ka_p4m'
      WHERE p.role IN ('staf_p4m', 'kepala_unit', 'ka_p4m')
      ORDER BY p.created_at DESC`
    );

    const data = rows.map((row) => ({
      ...row,
      role: ROLE_DB_TO_FE[row.role] || row.role,
      lastLogin: "-", // belum ada tracking last login di sistem
    }));

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error getUsers:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data akun." });
  }
}

// ── POST /api/users — tambah akun baru ───────────────────────────────
async function createUser(req, res) {
  const { name, email, role, nip, phone, unit, status, password } = req.body;

  if (!name || !email || !role || !password) {
    return res.status(400).json({ success: false, message: "Nama, email, role, dan password wajib diisi." });
  }

  const roleDb = ROLE_FE_TO_DB[role];
  if (!roleDb) {
    return res.status(400).json({ success: false, message: "Role tidak valid." });
  }

  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query("SELECT id_pengguna FROM pengguna WHERE email = ?", [email]);
    if (existing.length > 0) {
      conn.release();
      return res.status(409).json({ success: false, message: "Email sudah terdaftar." });
    }

    await conn.beginTransaction();

    const hashed = await bcrypt.hash(password, 10);
    const finalNip = nip?.trim() || generateNip();

    const [result] = await conn.query(
      `INSERT INTO pengguna (nama, email, password, role, status, nip)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, hashed, roleDb, status || "active", finalNip]
    );
    const idPengguna = result.insertId;

    if (roleDb === "staf_p4m") {
      await conn.query(
        `INSERT INTO staf_p4m (id_pengguna, nama, nip, email, no_telp) VALUES (?, ?, ?, ?, ?)`,
        [idPengguna, name, finalNip, email, phone || null]
      );
    } else if (roleDb === "kepala_unit") {
      await conn.query(
        `INSERT INTO kepala_unit (id_pengguna, nama, nip, unit) VALUES (?, ?, ?, ?)`,
        [idPengguna, name, finalNip, unit || ""]
      );
    } else if (roleDb === "ka_p4m") {
      await conn.query(
        `INSERT INTO ka_p4m (id_pengguna, nama, nip) VALUES (?, ?, ?)`,
        [idPengguna, name, finalNip]
      );
    }

    await conn.commit();
    return res.status(201).json({ success: true, message: "Akun berhasil ditambahkan.", id: idPengguna });
  } catch (error) {
    await conn.rollback();
    console.error("Error createUser:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Email atau NIP sudah dipakai." });
    }
    return res.status(500).json({ success: false, message: "Gagal menambahkan akun." });
  } finally {
    conn.release();
  }
}

// ── PUT /api/users/:id — edit akun ───────────────────────────────────
async function updateUser(req, res) {
  const { id } = req.params;
  const { name, email, role, nip, phone, unit, status, password } = req.body;

  const roleDb = ROLE_FE_TO_DB[role];
  if (!roleDb) {
    return res.status(400).json({ success: false, message: "Role tidak valid." });
  }

  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query("SELECT * FROM pengguna WHERE id_pengguna = ?", [id]);
    if (existing.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: "Akun tidak ditemukan." });
    }

    await conn.beginTransaction();

    if (password?.trim()) {
      const hashed = await bcrypt.hash(password, 10);
      await conn.query(
        `UPDATE pengguna SET nama=?, email=?, role=?, status=?, nip=?, password=? WHERE id_pengguna=?`,
        [name, email, roleDb, status || "active", nip || existing[0].nip, hashed, id]
      );
    } else {
      await conn.query(
        `UPDATE pengguna SET nama=?, email=?, role=?, status=?, nip=? WHERE id_pengguna=?`,
        [name, email, roleDb, status || "active", nip || existing[0].nip, id]
      );
    }

    // Sinkronkan ke tabel profil sesuai role (insert kalau belum ada baris-nya)
    if (roleDb === "staf_p4m") {
      await conn.query(
        `INSERT INTO staf_p4m (id_pengguna, nama, nip, email, no_telp)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nama=?, nip=?, email=?, no_telp=?`,
        [id, name, nip, email, phone || null, name, nip, email, phone || null]
      );
    } else if (roleDb === "kepala_unit") {
      await conn.query(
        `INSERT INTO kepala_unit (id_pengguna, nama, nip, unit)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nama=?, nip=?, unit=?`,
        [id, name, nip, unit || "", name, nip, unit || ""]
      );
    } else if (roleDb === "ka_p4m") {
      await conn.query(
        `INSERT INTO ka_p4m (id_pengguna, nama, nip)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE nama=?, nip=?`,
        [id, name, nip, name, nip]
      );
    }

    await conn.commit();
    return res.status(200).json({ success: true, message: "Akun berhasil diperbarui." });
  } catch (error) {
    await conn.rollback();
    console.error("Error updateUser:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Email atau NIP sudah dipakai akun lain." });
    }
    return res.status(500).json({ success: false, message: "Gagal memperbarui akun." });
  } finally {
    conn.release();
  }
}

// ── Helper: ambil data profil lengkap 1 akun (gabung tabel per-role) ──
async function fetchProfileById(id) {
  const [rows] = await pool.query(
    `SELECT
      p.id_pengguna AS id,
      p.nama        AS nama_lengkap,
      p.email       AS email,
      p.role        AS role,
      p.username    AS username,
      p.created_at  AS created_at,
      ku.unit       AS unit_kepala
    FROM pengguna p
    LEFT JOIN kepala_unit ku ON ku.id_pengguna = p.id_pengguna
    WHERE p.id_pengguna = ?`,
    [id]
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  const UNIT_DEFAULT = { staf_p4m: "P4M", ka_p4m: "P4M" };

  return {
    id: row.id,
    nama_lengkap: row.nama_lengkap,
    email: row.email,
    role: row.role,
    unit: row.unit_kepala || UNIT_DEFAULT[row.role] || "-",
    username: row.username || row.email.split("@")[0],
    created_at: row.created_at,
  };
}

// ── GET /api/users/profile — profil akun yang sedang login ───────────
// Dipakai halaman "Profil Saya" (Staf P4M, Kepala Unit, KA-P4M) untuk
// menampilkan data akun milik user itu sendiri (bukan CRUD akun lain).
async function getProfile(req, res) {
  try {
    const profile = await fetchProfileById(req.user.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Akun tidak ditemukan." });
    }
    return res.status(200).json(profile);
  } catch (error) {
    console.error("Error getProfile:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data profil." });
  }
}

// ── PUT /api/users/profile — update profil akun yang sedang login ────
async function updateProfile(req, res) {
  const userId = req.user.id;
  const { nama_lengkap, email } = req.body;

  if (!nama_lengkap?.trim() || !email?.trim()) {
    return res.status(400).json({ success: false, message: "Nama dan email wajib diisi." });
  }

  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query("SELECT role FROM pengguna WHERE id_pengguna = ?", [userId]);
    if (existing.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: "Akun tidak ditemukan." });
    }
    const role = existing[0].role;

    await conn.beginTransaction();

    await conn.query("UPDATE pengguna SET nama = ?, email = ? WHERE id_pengguna = ?", [
      nama_lengkap,
      email,
      userId,
    ]);

    // Sinkronkan juga ke tabel profil per-role biar data nama/email konsisten
    if (role === "staf_p4m") {
      await conn.query("UPDATE staf_p4m SET nama = ?, email = ? WHERE id_pengguna = ?", [
        nama_lengkap,
        email,
        userId,
      ]);
    } else if (role === "kepala_unit") {
      await conn.query("UPDATE kepala_unit SET nama = ? WHERE id_pengguna = ?", [nama_lengkap, userId]);
    } else if (role === "ka_p4m") {
      await conn.query("UPDATE ka_p4m SET nama = ? WHERE id_pengguna = ?", [nama_lengkap, userId]);
    }

    await conn.commit();

    const updated = await fetchProfileById(userId);
    return res.status(200).json(updated);
  } catch (error) {
    await conn.rollback();
    console.error("Error updateProfile:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Email sudah dipakai akun lain." });
    }
    return res.status(500).json({ success: false, message: "Gagal menyimpan perubahan." });
  } finally {
    conn.release();
  }
}

// ── PUT /api/users/change-password — ganti password akun sendiri ─────
// Dipakai halaman "Pengaturan". Beda dari updateUser/:id (itu buat Staf
// P4M ganti password akun ORANG LAIN); ini user ganti password DIRI
// SENDIRI, jadi wajib verifikasi password lama dulu.
async function changePassword(req, res) {
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Password lama dan baru wajib diisi." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Password baru minimal 6 karakter." });
  }

  try {
    const [rows] = await pool.query("SELECT password FROM pengguna WHERE id_pengguna = ?", [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Akun tidak ditemukan." });
    }

    const cocok = await bcrypt.compare(oldPassword, rows[0].password);
    if (!cocok) {
      return res.status(400).json({ success: false, message: "Password lama tidak sesuai." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE pengguna SET password = ? WHERE id_pengguna = ?", [hashed, userId]);

    return res.status(200).json({ success: true, message: "Password berhasil diubah." });
  } catch (error) {
    console.error("Error changePassword:", error);
    return res.status(500).json({ success: false, message: "Gagal mengubah password." });
  }
}

// ── DELETE /api/users/:id — hapus akun ───────────────────────────────
async function deleteUser(req, res) {
  const { id } = req.params;
  try {
    // ON DELETE CASCADE di staf_p4m/kepala_unit/ka_p4m otomatis ikut terhapus
    const [result] = await pool.query("DELETE FROM pengguna WHERE id_pengguna = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Akun tidak ditemukan." });
    }
    return res.status(200).json({ success: true, message: "Akun berhasil dihapus." });
  } catch (error) {
    console.error("Error deleteUser:", error);
    return res.status(500).json({ success: false, message: "Gagal menghapus akun." });
  }
}

// ── POST /api/users/:id/tanda-tangan — upload gambar TTD akun ────────
// Dipakai halaman Data Akun agar Staf P4M / Ka P4M / Kepala Unit punya
// tanda tangan digital yang otomatis ditempel di dokumen PDF (mis.
// PDF Rekapitulasi), mirip tanda tangan digital di dokumen bank.
async function uploadTandaTangan(req, res) {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ success: false, message: "Tidak ada file tanda tangan yang diunggah." });
  }

  try {
    const [existing] = await pool.query(
      "SELECT id_pengguna, tanda_tangan FROM pengguna WHERE id_pengguna = ?",
      [id]
    );
    if (existing.length === 0) {
      // hapus file yang sudah kepalang di-upload multer karena akun tidak ada
      fs.unlink(path.join(UPLOAD_DIR, req.file.filename), () => {});
      return res.status(404).json({ success: false, message: "Akun tidak ditemukan." });
    }

    // hapus file TTD lama (kalau ada) supaya folder uploads tidak menumpuk
    const fileLama = existing[0].tanda_tangan;
    if (fileLama) {
      fs.unlink(path.join(UPLOAD_DIR, fileLama), () => {});
    }

    await pool.query("UPDATE pengguna SET tanda_tangan = ? WHERE id_pengguna = ?", [
      req.file.filename,
      id,
    ]);

    return res.status(200).json({
      success: true,
      message: "Tanda tangan berhasil diunggah.",
      tandaTangan: req.file.filename,
    });
  } catch (error) {
    console.error("Error uploadTandaTangan:", error);
    return res.status(500).json({ success: false, message: "Gagal mengunggah tanda tangan." });
  }
}

// ── DELETE /api/users/:id/tanda-tangan — hapus gambar TTD akun ───────
async function deleteTandaTangan(req, res) {
  const { id } = req.params;
  try {
    const [existing] = await pool.query(
      "SELECT tanda_tangan FROM pengguna WHERE id_pengguna = ?",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Akun tidak ditemukan." });
    }

    const fileLama = existing[0].tanda_tangan;
    if (fileLama) {
      fs.unlink(path.join(UPLOAD_DIR, fileLama), () => {});
    }

    await pool.query("UPDATE pengguna SET tanda_tangan = NULL WHERE id_pengguna = ?", [id]);
    return res.status(200).json({ success: true, message: "Tanda tangan berhasil dihapus." });
  } catch (error) {
    console.error("Error deleteTandaTangan:", error);
    return res.status(500).json({ success: false, message: "Gagal menghapus tanda tangan." });
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  uploadTandaTangan,
  deleteTandaTangan,
  getProfile,
  updateProfile,
  changePassword,
};