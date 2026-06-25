// FILE: frontend/lib/exportPdf.ts
// Semua fungsi export PDF untuk Staf P4M
// Dipakai oleh:
//   - RecapitulationTable.tsx  → exportPDFRekap (per harian/mingguan/bulanan/tahunan)
//   - ProcessMonitorTable.tsx  → exportPDFProses (per laporan individual)

import type { RekapItem, ProsesItem } from "./exportTypes";
import {
  fmtTgl,
  fmtTglWaktu,
  labelStatusReview,
  labelStatusBoxing,
  getWeekNumber,
  sameDay,
} from "./exportHelpers";

export type PdfKategori = "harian" | "mingguan" | "bulanan" | "tahunan";

const BULAN_PANJANG = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

// ─── CSS bersama untuk semua PDF ────────────────────────────
const BASE_CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:10pt; color:#111; padding:20px; }
  .header { text-align:center; margin-bottom:16px; border-bottom:3px double #4d5e71; padding-bottom:12px; }
  .header h1 { font-size:15pt; font-weight:900; color:#4d5e71; }
  .header h2 { font-size:12pt; font-weight:700; color:#222; margin-top:4px; }
  .header p  { font-size:9pt; color:#555; margin-top:3px; }
  .stats { display:flex; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
  .stat { flex:1; min-width:100px; border:1.5px solid #e5e7eb; border-radius:6px; padding:8px 12px; }
  .stat .lbl { font-size:8pt; color:#6b7280; text-transform:uppercase; }
  .stat .val { font-size:20pt; font-weight:900; margin-top:2px; }
  .stat.total   .val { color:#4d5e71; }
  .stat.selesai .val { color:#059669; }
  .stat.pantau  .val { color:#d97706; }
  .stat.ditindak .val { color:#1d4ed8; }
  .stat.tidak   .val { color:#dc2626; }
  table { width:100%; border-collapse:collapse; font-size:9pt; }
  thead tr { background:#4d5e71; color:#fff; }
  thead th { padding:6px 5px; text-align:center; font-weight:700; border:1px solid #3a4d5e; }
  tbody tr:nth-child(even) { background:#f8fafc; }
  tbody td { padding:5px; border:1px solid #e2e8f0; vertical-align:top; line-height:1.4; }
  .center { text-align:center; }
  .badge { display:inline-block; padding:2px 6px; border-radius:3px; font-size:8pt; font-weight:bold; }
  .badge-green  { background:#d1fae5; color:#065f46; }
  .badge-red    { background:#fee2e2; color:#991b1b; }
  .badge-yellow { background:#fef3c7; color:#92400e; }
  .badge-blue   { background:#dbeafe; color:#1e40af; }
  .badge-gray   { background:#f3f4f6; color:#374151; }
  .footer { margin-top:16px; display:flex; justify-content:space-between; font-size:9pt; color:#6b7280; border-top:1px solid #e5e7eb; padding-top:8px; }
  .ttd { text-align:center; }
  .ttd .name { margin-top:48px; font-weight:700; border-top:1px solid #333; padding-top:4px; width:180px; margin:48px auto 0; }
  @media print { body { padding:8px; } @page { size:A4 landscape; margin:12mm; } }
`;

// ─── FIX: printWindow sekarang auto-close popup setelah print ───
// Sebelumnya popup tidak pernah ditutup → menyebabkan Next.js
// router bingung dan halaman parent loading terus / hilang.
function printWindow(html: string) {
  const win = window.open("", "_blank", "width=1100,height=750");
  if (!win) {
    alert("Popup diblokir browser. Izinkan popup untuk mencetak PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();

  // Tutup popup otomatis setelah user selesai dengan dialog print
  // (baik print maupun cancel)
  win.addEventListener("afterprint", () => {
    win.close();
  });
}

// ─── Script tag yang dipakai di setiap HTML template ────────
// afterprint sudah handle close, tapi tambah fallback kecil
// via focus kembali ke parent supaya Next.js tidak kehilangan context
const PRINT_SCRIPT = `
<script>
  window.onload = function() {
    window.print();
  };
  window.addEventListener('afterprint', function() {
    window.close();
  });
</script>
`;

// ═══════════════════════════════════════════════════════════════
// 1. PDF REKAPITULASI — per kategori waktu
// ═══════════════════════════════════════════════════════════════
export function exportPDFRekap(
  rekapData: RekapItem[],
  prosesData: ProsesItem[],
  kategori: PdfKategori,
  selectedDate: Date
) {
  function isInRange(iso: string | null): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    if (kategori === "harian")   return sameDay(d, selectedDate);
    if (kategori === "mingguan") return (
      d.getFullYear() === selectedDate.getFullYear() &&
      getWeekNumber(d) === getWeekNumber(selectedDate)
    );
    if (kategori === "bulanan")  return (
      d.getFullYear() === selectedDate.getFullYear() &&
      d.getMonth()    === selectedDate.getMonth()
    );
    return d.getFullYear() === selectedDate.getFullYear();
  }

  const selesaiBoxingIds = new Set(rekapData.map((d) => d.id_boxing));
  const dipantauData     = prosesData.filter((p) => !selesaiBoxingIds.has(p.id_boxing));

  const filteredSelesai  = rekapData.filter((d) => isInRange(d.created_at ?? null));
  const filteredDipantau = dipantauData.filter((p) => isInRange(p.created_at ?? null));

  const labelKat: Record<PdfKategori, string> = {
    harian:   `Tanggal ${fmtTgl(selectedDate.toISOString())}`,
    mingguan: `Minggu ke-${getWeekNumber(selectedDate)} / ${selectedDate.getFullYear()}`,
    bulanan:  `${BULAN_PANJANG[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`,
    tahunan:  `Tahun ${selectedDate.getFullYear()}`,
  };

  const selesaiRows = filteredSelesai.map((d, i) => ({
    no: i + 1,
    kode: d.kode_laporan,
    jenis: d.jenis_laporan ?? "—",
    uraian: d.uraian_ketidaksesuaian ?? "—",
    unit: d.nama_unit ?? "—",
    penyebab: d.penyebab ?? "—",
    rencana: d.rencana_tindakan ?? "—",
    hasil: d.hasil_tindakan ?? "—",
    tgl: fmtTgl(d.tanggal_pelaksanaan),
    statusReview: d.status_review ?? "",
    isSelesai: true,
  }));

  const dipantauRows = filteredDipantau.map((p, i) => ({
    no: filteredSelesai.length + i + 1,
    kode: p.kode_laporan,
    jenis: p.jenis_laporan ?? "—",
    uraian: p.isi_laporan ?? "—",
    unit: p.nama_unit ?? "—",
    penyebab: p.penyebab ?? "—",
    rencana: p.rencana_tindakan ?? "—",
    hasil: p.hasil_tindakan ?? "—",
    tgl: fmtTgl(p.tanggal_pelaksanaan),
    statusReview: p.status_review ?? "",
    isSelesai: false,
  }));

  const allRows = [...selesaiRows, ...dipantauRows];
  const ditindak = allRows.filter((r) => r.statusReview === "ditindaklanjuti").length;
  const tidakDitindak = allRows.filter((r) => r.statusReview === "tidak_ditindaklanjuti").length;

  function badgeReview(sr: string) {
    if (sr === "ditindaklanjuti")       return `<span class="badge badge-green">✓ Ditindaklanjuti</span>`;
    if (sr === "tidak_ditindaklanjuti") return `<span class="badge badge-red">✗ Tidak</span>`;
    if (sr === "menunggu_keputusan_ka") return `<span class="badge badge-yellow">⏳ Ka P4M</span>`;
    return `<span class="badge badge-gray">—</span>`;
  }

  const tableRows = allRows.map((r) => `
    <tr>
      <td class="center">${r.no}</td>
      <td class="center" style="font-weight:bold;font-size:8pt">${r.kode}</td>
      <td>${r.jenis}</td>
      <td>${r.uraian}</td>
      <td class="center">${r.unit}</td>
      <td>${r.penyebab}</td>
      <td>${r.rencana}</td>
      <td>${r.hasil}</td>
      <td class="center">${r.tgl}</td>
      <td class="center">${badgeReview(r.statusReview)}</td>
      <td class="center">
        <span class="badge ${r.isSelesai ? "badge-blue" : "badge-yellow"}">
          ${r.isSelesai ? "Selesai" : "Dipantau"}
        </span>
      </td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"/>
<title>Rekap — ${labelKat[kategori]}</title>
<style>${BASE_CSS}</style>
</head><body>
<div class="header">
  <h1>TUNTAS — Politeknik Negeri Batam</h1>
  <h2>Laporan Rekapitulasi Ketidaksesuaian</h2>
  <p>Periode: <strong>${labelKat[kategori]}</strong></p>
  <p>Dicetak: ${fmtTglWaktu(new Date().toISOString())}</p>
</div>
<div class="stats">
  <div class="stat total">  <div class="lbl">Total Laporan</div><div class="val">${allRows.length}</div></div>
  <div class="stat selesai"><div class="lbl">Selesai</div>      <div class="val">${filteredSelesai.length}</div></div>
  <div class="stat pantau"> <div class="lbl">Dipantau</div>     <div class="val">${filteredDipantau.length}</div></div>
  <div class="stat ditindak"><div class="lbl">Ditindaklanjuti</div><div class="val">${ditindak}</div></div>
  <div class="stat tidak">  <div class="lbl">Tidak Ditindak</div><div class="val">${tidakDitindak}</div></div>
</div>
<table>
  <thead><tr>
    <th style="width:28px">No</th>
    <th style="width:65px">Kode</th>
    <th style="width:55px">Jenis</th>
    <th>Uraian</th>
    <th style="width:70px">Unit</th>
    <th>Penyebab</th>
    <th>Rencana</th>
    <th>Hasil</th>
    <th style="width:72px">Tgl Selesai</th>
    <th style="width:88px">Status Review</th>
    <th style="width:65px">Status</th>
  </tr></thead>
  <tbody>${tableRows || `<tr><td colspan="11" style="text-align:center;padding:20px;color:#9ca3af;font-style:italic">Tidak ada data untuk periode ini</td></tr>`}</tbody>
</table>
<div class="footer">
  <div>
    <p>Dokumen digenerate otomatis oleh sistem TUNTAS Polibatam.</p>
    <p>Periode: ${labelKat[kategori]}</p>
  </div>
  <div class="ttd">
    <p>Batam, ${fmtTgl(new Date().toISOString())}</p>
    <p>Kepala P4M,</p>
    <div class="name">( _________________ )</div>
  </div>
</div>
${PRINT_SCRIPT}
</body></html>`;

  printWindow(html);
}

// ═══════════════════════════════════════════════════════════════
// 2. PDF PROSES MONITOR — per laporan individual
// ═══════════════════════════════════════════════════════════════
export interface ProsesDetailItem {
  kode_laporan: string;
  jenis_laporan: string | null;
  isi_laporan: string | null;
  nama_unit: string | null;
  status_boxing: string | null;
  status_review: string | null;
  approval_staf: string | null;
  aksi_masukan: string | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  hasil_tindakan: string | null;
  lampiran_hasil: string | null;
  tanggal_pelaksanaan: string | null;
  created_at?: string | null;
}

export function exportPDFProses(item: ProsesDetailItem) {
  const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"/>
<title>Laporan ${item.kode_laporan}</title>
<style>
  ${BASE_CSS}
  .section { margin-bottom:14px; }
  .section-title { font-size:10pt; font-weight:bold; color:#4d5e71; border-bottom:2px solid #4d5e71; padding-bottom:4px; margin-bottom:8px; text-transform:uppercase; }
  .field { display:flex; gap:8px; margin-bottom:6px; font-size:9pt; }
  .field .lbl { min-width:140px; font-weight:bold; color:#374151; }
  .field .val { color:#111; flex:1; }
  .box { border:1px solid #e2e8f0; padding:8px 10px; border-radius:4px; background:#f8fafc; font-size:9pt; line-height:1.6; min-height:40px; }
  @media print { @page { size:A4 portrait; margin:15mm; } }
</style>
</head><body>
<div class="header">
  <h1>TUNTAS — Politeknik Negeri Batam</h1>
  <h2>Laporan Ketidaksesuaian</h2>
  <p>Kode: <strong>${item.kode_laporan}</strong> &nbsp;|&nbsp; Dicetak: ${fmtTglWaktu(new Date().toISOString())}</p>
</div>

<div class="section">
  <div class="section-title">Identitas Laporan</div>
  <div class="field"><span class="lbl">Kode Laporan</span><span class="val">${item.kode_laporan}</span></div>
  <div class="field"><span class="lbl">Jenis</span><span class="val">${item.jenis_laporan ?? "—"}</span></div>
  <div class="field"><span class="lbl">Unit Tujuan</span><span class="val">${item.nama_unit ?? "—"}</span></div>
  <div class="field"><span class="lbl">Tanggal Masuk</span><span class="val">${fmtTgl(item.created_at ?? null)}</span></div>
  <div class="field"><span class="lbl">Status Boxing</span><span class="val">${labelStatusBoxing(item.status_boxing)}</span></div>
  <div class="field"><span class="lbl">Status Review</span><span class="val">${item.approval_staf === "ditolak" ? "Ditolak Staf P4M — Revisi Unit" : labelStatusReview(item.status_review)}</span></div>
</div>

<div class="section">
  <div class="section-title">Isi Laporan Civitas</div>
  <div class="box">${item.isi_laporan ?? "—"}</div>
</div>

<div class="section">
  <div class="section-title">Analisis Penyebab (Kepala Unit)</div>
  <div class="box">${item.penyebab ?? "<em style='color:#9ca3af'>Belum diisi</em>"}</div>
</div>

<div class="section">
  <div class="section-title">Rencana Tindakan (Kepala Unit)</div>
  <div class="box">${item.rencana_tindakan ?? "<em style='color:#9ca3af'>Belum diisi</em>"}</div>
</div>

${item.aksi_masukan ? `
<div class="section">
  <div class="section-title">Masukan Ka P4M</div>
  <div class="box" style="background:#eff6ff;border-color:#bfdbfe">${item.aksi_masukan}</div>
</div>` : ""}

<div class="section">
  <div class="section-title">Hasil Pelaksanaan Tindakan</div>
  ${item.tanggal_pelaksanaan
    ? `<div class="field"><span class="lbl">Tanggal Pelaksanaan</span><span class="val">${fmtTgl(item.tanggal_pelaksanaan)}</span></div>`
    : ""}
  <div class="box">${item.hasil_tindakan ?? "<em style='color:#9ca3af'>Belum ada hasil</em>"}</div>
</div>

<div class="footer">
  <div><p>Dokumen digenerate otomatis oleh sistem TUNTAS Polibatam.</p></div>
  <div class="ttd">
    <p>Batam, ${fmtTgl(new Date().toISOString())}</p>
    <p>Staf P4M,</p>
    <div class="name">( _________________ )</div>
  </div>
</div>
${PRINT_SCRIPT}
</body></html>`;

  printWindow(html);
}