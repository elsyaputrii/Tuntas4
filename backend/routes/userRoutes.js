// FILE: backend/routes/userRoutes.js
// Endpoint kelola akun (Data Akun) — hanya bisa diakses Staf P4M.

const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
const uploadSignature = require("../middleware/signatureUploadMiddleware");
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  uploadTandaTangan,
  deleteTandaTangan,
} = require("../controllers/userController");

router.use(authMiddleware);
router.use(roleMiddleware("staf_p4m"));

router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

// Tanda tangan digital (TTD) akun — dipakai untuk tanda tangan di PDF
router.post("/:id/tanda-tangan", uploadSignature.single("tanda_tangan"), uploadTandaTangan);
router.delete("/:id/tanda-tangan", deleteTandaTangan);

module.exports = router;