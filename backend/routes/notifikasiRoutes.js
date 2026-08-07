// FILE: backend/routes/notifikasiRoutes.js
//
// Endpoint notifikasi in-app — dipakai oleh lonceng 🔔 di semua role
// (staf_p4m, kepala_unit, ka_p4m). Semua endpoint butuh login (JWT),
// dan hanya mengambil/mengubah notifikasi MILIK akun yang sedang login
// (filter WHERE id_pengguna = req.user.id).

const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const { authMiddleware } = require("../middleware/authMiddleware");

router.use(authMiddleware);

// ============================================================
// GET /api/notifikasi
// Ambil 20 notifikasi terbaru milik akun yang login
// ============================================================
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_notifikasi, judul, pesan, jenis, link, is_read, created_at
       FROM notifikasi
       WHERE id_pengguna = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error getNotifikasi:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil notifikasi." });
  }
});

// ============================================================
// GET /api/notifikasi/unread-count
// Untuk badge angka di lonceng (dipanggil berkala/polling)
// ============================================================
router.get("/unread-count", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS unread FROM notifikasi WHERE id_pengguna = ? AND is_read = 0`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, data: { unread: rows[0].unread } });
  } catch (error) {
    console.error("Error getUnreadCount:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil jumlah notifikasi." });
  }
});

// ============================================================
// PATCH /api/notifikasi/:id/read
// Tandai 1 notifikasi sudah dibaca (dipanggil pas notif diklik)
// ============================================================
router.patch("/:id/read", async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE notifikasi SET is_read = 1 WHERE id_notifikasi = ? AND id_pengguna = ?`,
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Notifikasi tidak ditemukan." });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error markAsRead:", error);
    return res.status(500).json({ success: false, message: "Gagal menandai notifikasi." });
  }
});

// ============================================================
// PATCH /api/notifikasi/read-all
// Tandai SEMUA notifikasi milik akun ini sudah dibaca
// ============================================================
router.patch("/read-all", async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifikasi SET is_read = 1 WHERE id_pengguna = ? AND is_read = 0`,
      [req.user.id]
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error markAllAsRead:", error);
    return res.status(500).json({ success: false, message: "Gagal menandai semua notifikasi." });
  }
});

module.exports = router;