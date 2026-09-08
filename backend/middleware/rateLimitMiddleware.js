// FILE: backend/middleware/rateLimitMiddleware.js
// Rate limit per IP untuk endpoint publik POST /api/civitas/laporan.
// Tanpa auth (civitas anonim), endpoint ini kalau tidak dibatasi bisa
// dipakai untuk flood/spam laporan palsu dari satu sumber.
//
// PENTING soal `trust proxy`: kalau backend ini duduk di belakang Nginx
// (proxy), req.ip Express defaultnya adalah IP Nginx itu sendiri (bukan IP
// pengunjung asli), jadi rate limit-nya salah sasaran (semua request
// dianggap dari 1 IP yang sama = Nginx). Makanya `app.set('trust proxy', 1)`
// WAJIB di server.js supaya Express baca header `X-Forwarded-For` dari
// Nginx dan dapat IP asli client. Lihat server.js.

const rateLimit = require("express-rate-limit");

const laporanLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  max: 5,                   // maksimal 5 laporan per IP per 10 menit
  standardHeaders: true,    // kirim info limit lewat header RateLimit-*
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    message: "Terlalu banyak laporan dikirim dari perangkat ini. Coba lagi dalam beberapa menit.",
  },
  // Kalau trust proxy di server.js SALAH konfigurasi, express-rate-limit
  // akan melempar error validasi saat start-up daripada diam-diam rate
  // limit semua orang jadi satu — biar ketauan dari awal kalau salah setup.
});

module.exports = { laporanLimiter };
