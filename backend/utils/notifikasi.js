// FILE: backend/utils/notifikasi.js
//
// Helper terpusat untuk notifikasi in-app (tabel `notifikasi`, muncul di
// lonceng 🔔 tiap dashboard) SEKALIGUS email (pakai Gmail).
//
// PENTING: semua fungsi di sini sengaja TIDAK melempar error ke pemanggil.
// Gagal kirim notifikasi/email tidak boleh bikin proses utama ikut gagal.
//
// ✅ FIX email tidak masuk ke staf:
// Sebelumnya email baru dikirim SETELAH insert ke tabel `notifikasi` berhasil.
// Kalau insert gagal (mis. kolom `jenis` ENUM tidak punya nilai yang dipakai),
// error cuma masuk log dan email tidak pernah dikirim. Sekarang email dan
// notifikasi in-app dijalankan terpisah, jadi gagal satu tidak membatalkan
// yang lain. Ditambah log jumlah penerima supaya gampang dilacak.

const nodemailer = require("nodemailer");
const { pool } = require("../config/db");

const transporter = nodemailer.createTransport({
  service: "gmail",
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Cek login SMTP sekali saat server start, supaya kalau EMAIL_USER/EMAIL_PASS
// (App Password Gmail) salah atau port diblokir, langsung kelihatan di log.
transporter
  .verify()
  .then(() => console.log("✅ SMTP Gmail siap mengirim email."))
  .catch((error) =>
    console.error("❌ SMTP Gmail GAGAL terhubung:", error.message)
  );

const MAX_PERCOBAAN_EMAIL = 3;
const JEDA_RETRY_MS = 5000; // 5 dtk, lalu 10 dtk

async function kirimDenganRetry(mail, percobaan = 1) {
  const mulai = Date.now();
  try {
    await transporter.sendMail(mail);
    console.log(
      `📧 Email ke ${mail.to} terkirim ke Gmail dalam ${Date.now() - mulai} ms` +
        (percobaan > 1 ? ` (percobaan ke-${percobaan})` : "")
    );
  } catch (error) {
    if (percobaan < MAX_PERCOBAAN_EMAIL) {
      const jeda = JEDA_RETRY_MS * percobaan;
      console.warn(
        `⚠️ Email ke ${mail.to} gagal (${error.message}). Coba lagi ${jeda / 1000} dtk lagi (percobaan ${percobaan}/${MAX_PERCOBAAN_EMAIL}).`
      );
      setTimeout(() => kirimDenganRetry(mail, percobaan + 1), jeda);
    } else {
      console.error(
        `❌ Gagal kirim email ke ${mail.to} setelah ${MAX_PERCOBAAN_EMAIL} percobaan:`,
        error.message
      );
    }
  }
}

// ============================================================
// KONFIGURASI
// ============================================================
// Alamat aplikasi yang bisa dibuka penerima email (BUKAN localhost)
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");

if (/localhost|127\.0\.0\.1/.test(FRONTEND_URL)) {
  console.warn(
    "⚠️  FRONTEND_URL masih localhost. Tombol di email tidak akan bisa dibuka orang lain."
  );
}

// Mode uji coba: email HANYA dikirim ke alamat di EMAIL_ALLOWLIST.
// Kalau EMAIL_TEST_MODE=false (atau tidak diisi), email dikirim ke semua akun.
const EMAIL_TEST_MODE = process.env.EMAIL_TEST_MODE === "true";
const EMAIL_ALLOWLIST = (process.env.EMAIL_ALLOWLIST || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (EMAIL_TEST_MODE) {
  console.warn(
    `⚠️  EMAIL_TEST_MODE aktif: email hanya dikirim ke: ${EMAIL_ALLOWLIST.join(", ") || "(kosong)"}`
  );
}

// ============================================================
// KIRIM EMAIL (dipanggil internal, tidak melempar error)
// ============================================================
async function kirimEmail(to, judul, pesan, link) {
  if (!to) {
    console.warn(`⚠️ Email "${judul}" dilewati: alamat email penerima kosong.`);
    return;
  }

  let subject = judul;

  if (EMAIL_TEST_MODE) {
    if (!EMAIL_ALLOWLIST.includes(String(to).trim().toLowerCase())) {
      console.log(`[TEST MODE] Email ke ${to} dilewati (tidak ada di EMAIL_ALLOWLIST).`);
      return;
    }
    subject = `[UJI COBA] ${judul}`;
  }

  const url = link ? `${FRONTEND_URL}${link.startsWith("/") ? link : "/" + link}` : null;

  // kirimDenganRetry tidak pernah melempar error, jadi aman dipanggil tanpa await
  await kirimDenganRetry({
    from: `"TUNTAS4 - P4M Polibatam" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #18253d;">${judul}</h2>
          <p style="font-size: 14px; color: #333;">${pesan}</p>
          ${
            url
              ? `<p><a href="${url}" style="display:inline-block; margin-top:12px; padding:10px 18px; background:#18253d; color:#fff; text-decoration:none; border-radius:8px;">Buka di TUNTAS4</a></p>`
              : ""
          }
          <p style="font-size: 12px; color: #888; margin-top: 24px;">
            Email ini dikirim otomatis oleh sistem TUNTAS4, mohon tidak dibalas.
          </p>
        </div>
      `,
  });
}

// ============================================================
// BUAT 1 NOTIFIKASI untuk 1 akun (id_pengguna sudah diketahui)
// ============================================================
async function notifikasiUntukPengguna(id_pengguna, { judul, pesan, jenis, link }) {
  if (!id_pengguna) return;

  // 1) Ambil email dulu, lalu kirim — terpisah dari insert notifikasi in-app
  try {
    const [rows] = await pool.query(
      `SELECT email FROM pengguna WHERE id_pengguna = ?`,
      [id_pengguna]
    );
    if (rows.length > 0) {
      kirimEmail(rows[0].email, judul, pesan, link);
    } else {
      console.warn(`⚠️ Notifikasi "${judul}": pengguna ${id_pengguna} tidak ditemukan.`);
    }
  } catch (error) {
    console.error("❌ Gagal ambil email penerima (per pengguna):", error.message);
  }

  // 2) Notifikasi in-app (lonceng)
  try {
    await pool.query(
      `INSERT INTO notifikasi (id_pengguna, judul, pesan, jenis, link)
       VALUES (?, ?, ?, ?, ?)`,
      [id_pengguna, judul, pesan, jenis, link || null]
    );
  } catch (error) {
    console.error("❌ Gagal insert notifikasi in-app (per pengguna):", error.message);
  }
}

// ============================================================
// BUAT NOTIFIKASI untuk SEMUA akun dengan role tertentu
// ============================================================
async function notifikasiUntukRole(role, { judul, pesan, jenis, link }) {
  let users = [];
  try {
    const [rows] = await pool.query(
      `SELECT id_pengguna, email FROM pengguna WHERE role = ?`,
      [role]
    );
    users = rows;
  } catch (error) {
    console.error("❌ Gagal ambil penerima notifikasi (per role):", error.message);
    return;
  }

  console.log(`🔔 Notifikasi "${judul}" untuk role ${role}: ${users.length} penerima`);
  if (users.length === 0) return;

  // 1) Email dikirim lebih dulu, terpisah dari insert notifikasi in-app
  for (const u of users) {
    kirimEmail(u.email, judul, pesan, link);
  }

  // 2) Notifikasi in-app (lonceng)
  try {
    const values = users.map((u) => [u.id_pengguna, judul, pesan, jenis, link || null]);
    await pool.query(
      `INSERT INTO notifikasi (id_pengguna, judul, pesan, jenis, link) VALUES ?`,
      [values]
    );
  } catch (error) {
    console.error("❌ Gagal insert notifikasi in-app (per role):", error.message);
  }
}

module.exports = {
  notifikasiUntukPengguna,
  notifikasiUntukRole,
};