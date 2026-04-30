// FILE: backend/middleware/authMiddleware.js
// Cek token JWT di setiap request yang butuh login
// Cara pakai di route: router.use(authMiddleware)

const jwt = require("jsonwebtoken");

// ── Cek apakah token valid ────────────────────────────────
function authMiddleware(req, res, next) {
  // Token dikirim di header: Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];
  const token      = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Akses ditolak. Silakan login terlebih dahulu.",
    });
  }

  try {
    // Verifikasi token → kalau valid, isi req.user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({
      success: false,
      message: "Token tidak valid atau sudah kadaluarsa. Silakan login ulang.",
    });
  }
}

// ── Cek apakah role user sesuai ──────────────────────────
// Contoh pemakaian: roleMiddleware("staf_p4m")
function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Halaman ini hanya untuk: ${roles.join(", ")}.`,
      });
    }
    next();
  };
}

module.exports = { authMiddleware, roleMiddleware };