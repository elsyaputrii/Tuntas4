// FILE: frontend/lib/exportExcel.ts
// Semua fungsi export Excel untuk Staf P4M
// Dipakai oleh RecapitulationTable.tsx

import type { RekapItem, ProsesItem } from "./exportTypes";
import { fmtTgl, labelStatusReview, labelStatusBoxing } from "./exportHelpers";

/**
 * Export semua laporan ke CSV (bisa dibuka Excel).
 * Menggabungkan:
 *   - laporan SELESAI  (dari /staf/rekap)
 *   - laporan DIPANTAU (dari /staf/proses — yang belum ada di rekap)
 */
export function exportExcel(
  rekapData: RekapItem[],
  prosesData: ProsesItem[]
) {
  // Laporan yang sudah selesai (id_boxing sudah ada di rekap)
  const selesaiBoxingIds = new Set(rekapData.map((d) => d.id_boxing));

  // Laporan proses yang BELUM masuk rekap (masih dipantau / terdistribusi)
  const dipantauData = prosesData.filter(
    (p) => !selesaiBoxingIds.has(p.id_boxing)
  );

  // ─── Baris ringkasan ────────────────────────────────────────
  const totalAll  = rekapData.length + dipantauData.length;
  const ditindak  = rekapData.filter((d) => d.status_review === "ditindaklanjuti").length
                  + dipantauData.filter((p) => p.status_review === "ditindaklanjuti").length;
  const tidakDitindak = rekapData.filter((d) => d.status_review === "tidak_ditindaklanjuti").length
                      + dipantauData.filter((p) => p.status_review === "tidak_ditindaklanjuti").length;

  const rows: string[][] = [
    ["REKAPITULASI LAPORAN KETIDAKSESUAIAN — TUNTAS POLIBATAM"],
    ["Tanggal Export", new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })],
    [],
    ["RINGKASAN"],
    ["Total Semua Laporan",        String(totalAll)],
    ["Laporan Selesai",            String(rekapData.length)],
    ["Laporan Masih Dipantau",     String(dipantauData.length)],
    ["Ditindaklanjuti",            String(ditindak)],
    ["Tidak Ditindaklanjuti",      String(tidakDitindak)],
    [],
    // Header kolom tabel
    [
      "No", "Kode Laporan", "Jenis", "Uraian Ketidaksesuaian",
      "Unit", "Penyebab", "Rencana Tindakan", "Hasil Tindak Lanjut",
      "Tgl Pelaksanaan", "Status Review", "Status Boxing", "Tgl Masuk",
    ],
  ];

  // ─── Baris laporan SELESAI ───────────────────────────────────
  rekapData.forEach((d, i) => {
    rows.push([
      String(i + 1),
      d.kode_laporan,
      d.jenis_laporan         ?? "—",
      d.uraian_ketidaksesuaian ?? "—",
      d.nama_unit             ?? "—",
      d.penyebab              ?? "—",
      d.rencana_tindakan      ?? "—",
      d.hasil_tindakan        ?? "—",
      fmtTgl(d.tanggal_pelaksanaan),
      labelStatusReview(d.status_review),
      "Selesai",
      fmtTgl(d.created_at ?? null),
    ]);
  });

  // ─── Baris laporan DIPANTAU ──────────────────────────────────
  dipantauData.forEach((p, i) => {
    rows.push([
      String(rekapData.length + i + 1),
      p.kode_laporan,
      p.jenis_laporan    ?? "—",
      p.isi_laporan      ?? "—",
      p.nama_unit        ?? "—",
      p.penyebab         ?? "—",
      p.rencana_tindakan ?? "—",
      p.hasil_tindakan   ?? "—",
      fmtTgl(p.tanggal_pelaksanaan),
      labelStatusReview(p.status_review),
      labelStatusBoxing(p.status_boxing),
      fmtTgl(p.created_at ?? null),
    ]);
  });

  // ─── Tulis file CSV ──────────────────────────────────────────
  const csv =
    "\uFEFF" +
    rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
      )
      .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Rekapitulasi_TUNTAS_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}