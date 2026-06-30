// FILE: backend/routes/userRoutes.js
// Endpoint kelola akun (Data Akun) — hanya bisa diakses Staf P4M.

const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
const { getUsers, createUser, updateUser, deleteUser } = require("../controllers/userController");

router.use(authMiddleware);
router.use(roleMiddleware("staf_p4m"));

router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;