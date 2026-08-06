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
  getProfile,
  updateProfile,
  changePassword,
} = require("../controllers/userController");

router.use(authMiddleware);

// Profil & ganti password akun sendiri — semua role yang sudah login
// boleh akses, TIDAK dibatasi hanya staf_p4m. Harus didaftarkan sebelum
// roleMiddleware & sebelum route "/:id" biar "profile"/"change-password"
// tidak ketangkap sebagai :id.
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);

router.use(roleMiddleware("staf_p4m"));

router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

// Tanda tangan digital (TTD) akun — dipakai untuk tanda tangan di PDF
router.post("/:id/tanda-tangan", uploadSignature.single("tanda_tangan"), uploadTandaTangan);
router.delete("/:id/tanda-tangan", deleteTandaTangan);

module.exports = router;