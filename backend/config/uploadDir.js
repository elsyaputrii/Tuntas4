// ============================================================
// FILE: config/uploadDir.js
// Satu-satunya sumber kebenaran untuk folder upload.
//
// ✅ FIX: sebelumnya tiap middleware punya baris sendiri-sendiri:
//   const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
// "uploads" di situ adalah path RELATIF — artinya lokasinya
// tergantung process.cwd() saat server dijalankan, bisa beda-beda
// tergantung dari folder mana `node server.js` / `pm2 start` dipanggil
// di server production. Sementara server.js men-serve file statis dari
// path ABSOLUT `path.join(__dirname, "uploads")`.
//
// Kalau UPLOAD_DIR (relatif) dan folder yang di-serve statis itu
// resolve ke tempat berbeda, hasilnya: file KESIMPAN tapi gak pernah
// bisa DIAKSES lewat /uploads/... (404). Ini penyebab kenapa lampiran
// & tanda tangan yang di-upload di production tidak bisa dibuka,
// walau di localhost baik-baik saja.
//
// Fix-nya: selalu resolve ke path absolut yang sama, dijangkarkan ke
// lokasi file ini (backend/config/uploadDir.js → backend/uploads),
// bukan ke cwd proses. Kalau UPLOAD_DIR di .env diisi path absolut
// (misal disk terpisah di production), itu tetap dihormati.
// ============================================================

const path = require("path");
const fs = require("fs");

const envDir = process.env.UPLOAD_DIR;
const UPLOAD_DIR = envDir && path.isAbsolute(envDir)
  ? envDir
  : path.join(__dirname, "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`📁 Folder upload '${UPLOAD_DIR}' berhasil dibuat`);
}

module.exports = UPLOAD_DIR;
