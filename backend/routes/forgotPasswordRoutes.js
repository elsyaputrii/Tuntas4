// FILE: backend/routes/forgotPasswordRoutes.js
// Route untuk alur lupa password — tidak butuh login

const express = require("express");
const router  = express.Router();
const {
  requestReset,
  resetPassword,
  cekToken,
} = require("../controllers/forgotPasswordController");

// POST /api/forgot-password/request   → minta link reset
router.post("/request", requestReset);

// POST /api/forgot-password/reset     → simpan password baru
router.post("/reset",   resetPassword);

// GET  /api/forgot-password/cek-token → cek apakah token masih valid
router.get("/cek-token", cekToken);

module.exports = router;