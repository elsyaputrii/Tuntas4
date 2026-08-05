// FILE: backend/routes/authRoutes.js
// Route login TERPISAH per role
// Masing-masing endpoint hanya menerima role yang sesuai

const express = require("express");
const router  = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  login,
  loginStaf,
  loginKaP4M,
  loginKepalaUnit,
  getMe,
} = require("../controllers/authController");

// ── Login gabungan (dipakai halaman /login) ─────────────────
// POST /api/auth/login → role dideteksi otomatis dari akun
router.post("/login", login);

// ── Login per role (LAMA, dibiarkan aktif untuk kompatibilitas
//    kalau ada yang masih memanggilnya, tapi frontend baru
//    sudah tidak menggunakan endpoint ini lagi) ───────────────
// POST /api/auth/staf/login        → khusus Staf P4M
// POST /api/auth/kap4m/login       → khusus Ka P4M
// POST /api/auth/kepala-unit/login → khusus Kepala Unit
router.post("/staf/login",        loginStaf);
router.post("/kap4m/login",       loginKaP4M);
router.post("/kepala-unit/login", loginKepalaUnit);

// ── Cek token aktif ───────────────────────────────────────
// GET /api/auth/me → butuh token yang valid
router.get("/me", authMiddleware, getMe);

module.exports = router;