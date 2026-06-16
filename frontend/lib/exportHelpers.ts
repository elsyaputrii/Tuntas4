// FILE: frontend/lib/exportHelpers.ts
// Fungsi-fungsi pembantu bersama untuk export Excel & PDF

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
 * Normalkan ISO string dari DB (UTC) ke Date lokal
 * supaya perbandingan hari tidak tergeser akibat timezone.
 * Contoh: "2026-06-02T00:00:00.000Z" di UTC+7 → tetap 2 Juni, bukan 1 Juni.
 */
export function toLocalDate(iso: string): Date {
  // Ambil bagian tanggal saja (YYYY-MM-DD) lalu buat Date lokal
  const part = iso.slice(0, 10); // "2026-06-02"
  const [y, m, d] = part.split("-").map(Number);
  return new Date(y, m - 1, d);
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