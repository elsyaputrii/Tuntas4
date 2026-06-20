// FILE: frontend/lib/exportHelpers.ts
// Fungsi-fungsi pembantu bersama untuk export Excel & PDF
//
// ── FIX (kalender "ngebug") ──────────────────────────────────────────────
// Sebelumnya toLocalDate() memotong string ISO mentah-mentah ("2026-06-02..."
// → "2026-06-02") TANPA konversi timezone. Padahal nilai created_at dari
// MySQL itu disimpan dalam UTC. Untuk laporan yang masuk jam 00:00–06:59 WIB,
// nilai UTC-nya masih menunjukkan TANGGAL SEBELUMNYA, sehingga kalender
// menandai titik biru di hari yang salah dan filter "Harian" tidak
// menemukan data yang seharusnya cocok.
//
// Sekarang toLocalDate() membuat objek Date asli dari string ISO (otomatis
// terkonversi ke timezone browser/lokal — WIB jika user di Indonesia), lalu
// mengambil komponen tanggal LOKAL (getFullYear/getMonth/getDate), bukan
// dari string UTC mentah.

const BULAN_PANJANG = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

/** Format tanggal → "15 Juni 2026" */
export function fmtTgl(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()} ${BULAN_PANJANG[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format tanggal + waktu → "15 Juni 2026, 08:30" */
export function fmtTglWaktu(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const jam  = String(d.getHours()).padStart(2, "0");
  const mnt  = String(d.getMinutes()).padStart(2, "0");
  return `${fmtTgl(iso)}, ${jam}:${mnt}`;
}

/** Nomor minggu ISO */
export function getWeekNumber(d: Date): number {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

/**
 * ✅ FIX: Konversi ISO string dari DB (UTC) ke Date LOKAL dengan benar.
 *
 * SEBELUMNYA (SALAH):
 *   const part = iso.slice(0, 10); // ambil "2026-06-02" dari string UTC
 *   → ini masih tanggal UTC, BUKAN tanggal lokal WIB.
 *   Contoh bug: created_at UTC "2026-06-01T20:30:00.000Z"
 *               = jam 03:30 WIB tanggal 2 Juni.
 *   Kode lama mengambil "2026-06-01" (salah, harusnya 2 Juni).
 *
 * SEKARANG (BENAR):
 *   new Date(iso) otomatis dikonversi browser ke timezone lokal (WIB),
 *   lalu kita ambil getFullYear()/getMonth()/getDate() yang SUDAH lokal.
 */
export function toLocalDate(iso: string): Date {
  const utcDate = new Date(iso);
  return new Date(
    utcDate.getFullYear(),
    utcDate.getMonth(),
    utcDate.getDate()
  );
}

/** Cek apakah dua Date dalam hari yang sama (berdasarkan komponen lokal) */
export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

/** Label bahasa Indonesia untuk status_review */
export function labelStatusReview(sr: string | null | undefined): string {
  switch (sr) {
    case "ditindaklanjuti":       return "Ditindaklanjuti";
    case "tidak_ditindaklanjuti": return "Tidak Ditindaklanjuti";
    case "menunggu_keputusan_ka": return "Menunggu Ka P4M";
    default: return "—";
  }
}

/** Label bahasa Indonesia untuk status_boxing */
export function labelStatusBoxing(sb: string | null | undefined): string {
  switch (sb) {
    case "selesai":              return "Selesai";
    case "di_staff":             return "Di Staf P4M";
    case "menunggu_pelaksanaan": return "Menunggu Unit";
    case "diproses":             return "Diproses";
    case "terdistribusi":        return "Terdistribusi";
    default: return "—";
  }
}

/**
 * ✅ getReopenAction — cek apakah boxing ini boleh "dibuka kembali" (reopen)
 * ke unit. Disinkronkan 1:1 dengan validasi backend di stafController.js
 * (fungsi setKeputusanBoxing, opsi "lanjut" / "ditindak_lanjut").
 *
 *   - "ditindak_lanjut" → hanya valid jika boxing SELESAI dan
 *     review-nya "ditindaklanjuti" (kasus: mau tindak lanjut ulang).
 *   - "lanjut" → hanya valid jika:
 *       a) boxing sudah SELESAI (mau dibuka lagi apa pun alasannya), ATAU
 *       b) boxing ada di STAF (di_staff) dan ditolak Ka P4M
 *          (tidak_ditindaklanjuti).
 *
 * Backend pesan errornya: "Opsi 'lanjut' hanya untuk laporan selesai
 * atau yang ditolak Ka P4M."
 *
 * Catatan: sekarang KEDUA aksi ini ("lanjut" dan "ditindak_lanjut") di
 * backend melakukan hal yang SAMA — reset penuh ke 'terdistribusi' +
 * reset rancangan_tindakan + hapus pelaksanaan_tindakan lama — supaya
 * laporan benar-benar mulai dari awal lagi di tab "Ketidaksesuaian
 * Masuk" Kepala Unit. Label tombolnya tetap dibedakan di UI agar jelas
 * konteksnya bagi Staf P4M, tapi efeknya di backend identik.
 */
export function getReopenAction(
  statusBoxing: string | null | undefined,
  statusReview: string | null | undefined
): "ditindak_lanjut" | "lanjut" | null {
  const isSelesai = statusBoxing === "selesai";
  const isDiStaffDitolak =
    statusBoxing === "di_staff" && statusReview === "tidak_ditindaklanjuti";

  if (isSelesai && statusReview === "ditindaklanjuti") {
    return "ditindak_lanjut";
  }
  if (isSelesai || isDiStaffDitolak) {
    return "lanjut";
  }
  return null; // tidak boleh dibuka kembali — backend akan menolak
}

/**
 * ✅ label status yang LEBIH AKURAT daripada cuma "Dipantau" generik.
 *
 * Sebelumnya RecapitulationTable.tsx menandai SEMUA laporan yang belum
 * status_boxing='selesai' dengan label "⏳ Dipantau" yang sama, tanpa
 * membedakan kondisi sebenarnya. Akibatnya laporan yang SEBENARNYA sudah
 * berada di tahap "menunggu approval Staf P4M" (sudah dikerjakan Kepala
 * Unit, tinggal di-acc/tolak oleh Staf) terlihat sama persis dengan
 * laporan yang masih di tahap awal/macet — sehingga membingungkan.
 *
 * Fungsi ini memetakan kombinasi (status_boxing, status_review,
 * approval_staf) ke label + warna yang mencerminkan tahap SEBENARNYA:
 *
 *   di_staff + approval='menunggu'   → "Menunggu Approval Staf"  (kuning, BUTUH aksi Staf)
 *   di_staff + approval='ditolak'    → "Ditolak — Revisi Unit"   (merah)
 *   menunggu_pelaksanaan             → "Diproses Kepala Unit"    (biru, masih di unit)
 *   diproses/terdistribusi           → "Diproses Kepala Unit"    (biru)
 *   review='menunggu_keputusan_ka'   → "Menunggu Ka P4M"         (kuning)
 *   default (fallback)               → "Dipantau"                (kuning)
 *
 * Catatan: approval_staf='diterima' TIDAK akan pernah sampai ke fungsi
 * ini lagi sejak backend diperbaiki — karena 'diterima' langsung membuat
 * status_boxing='selesai', yang ditangani terpisah sebagai "✓ Selesai"
 * oleh pemanggil (lihat RecapitulationTable.tsx).
 */
export interface StatusLengkap {
  label: string;
  cls: string; // className tailwind untuk badge
  butuhAksiStaf: boolean; // true kalau Staf P4M perlu approve/tolak SEKARANG
}

export function labelStatusLengkap(
  statusBoxing: string | null | undefined,
  statusReview: string | null | undefined,
  approvalStaf: string | null | undefined
): StatusLengkap {
  if (statusBoxing === "di_staff") {
    if (approvalStaf === "ditolak") {
      return { label: "✗ Ditolak — Revisi Unit", cls: "bg-red-100 text-red-700", butuhAksiStaf: false };
    }
    // approvalStaf null/"menunggu"/undefined → laporan sudah dikerjakan
    // unit, sedang menunggu Staf P4M klik approve/tolak.
    return { label: "⏳ Menunggu Approval Staf", cls: "bg-amber-100 text-amber-700", butuhAksiStaf: true };
  }

  if (statusBoxing === "menunggu_pelaksanaan" || statusBoxing === "diproses" || statusBoxing === "terdistribusi") {
    if (statusReview === "menunggu_keputusan_ka" || !statusReview) {
      return { label: "⏳ Menunggu Ka P4M", cls: "bg-yellow-100 text-yellow-700", butuhAksiStaf: false };
    }
    return { label: "🔄 Diproses Kepala Unit", cls: "bg-blue-100 text-blue-700", butuhAksiStaf: false };
  }

  if (statusBoxing === "selesai") {
    return { label: "✓ Selesai", cls: "bg-green-100 text-green-700", butuhAksiStaf: false };
  }

  return { label: "⏳ Dipantau", cls: "bg-amber-100 text-amber-700", butuhAksiStaf: false };
}