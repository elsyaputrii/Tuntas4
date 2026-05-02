// FILE: backend/routes/forgotPasswordRoutes.js
// Dua endpoint publik untuk reset password
// Tidak butuh auth karena user belum bisa login

const express = require("express");
const router  = express.Router();
const {
  requestReset,
  resetPassword,
} = require("../controllers/forgotPasswordController");

// POST /api/auth/forgot-password
// → User kirim email, sistem kirim link reset
router.post("/forgot-password", requestReset);

// POST /api/auth/reset-password
// → User kirim token + password baru
router.post("/reset-password", resetPassword);

module.exports = router;