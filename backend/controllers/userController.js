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
const { pool } = require("../config/db");

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

module.exports = { getUsers, createUser, updateUser, deleteUser };