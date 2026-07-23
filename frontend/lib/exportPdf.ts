// FILE: frontend/lib/exportPdf.ts
// Semua fungsi export PDF untuk Staf P4M
// Dipakai oleh:
//   - RecapitulationTable.tsx  → exportPDFRekap (per harian/mingguan/bulanan/tahunan)
//   - ProcessMonitorTable.tsx  → exportPDFProses (per laporan individual)

import QRCode from "qrcode";
import type { RekapItem, ProsesItem } from "./exportTypes";
import {
  fmtTgl,
  fmtTglWaktu,
  labelStatusReview,
  labelStatusBoxing,
  getWeekOfMonth,
  sameWeekOfMonth,
  sameDay,
} from "./exportHelpers";

// ─── QR Code TTD ─────────────────────────────────────────────
// Menggantikan gambar tanda tangan dengan QR code yang bisa discan.
// QR berisi teks info penandatangan (offline, tidak butuh endpoint
// verifikasi di backend) — cukup dipindai pakai kamera/QR scanner
// apa pun untuk menampilkan info TTD-nya.
async function generateQrDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, {
      width: 130,
      margin: 1,
      color: { dark: "#111111", light: "#ffffff" },
    });
  } catch {
    return null; // nonfatal — PDF tetap bisa dicetak tanpa QR
  }
}

// Menghapus gelar "Dr." di depan nama penandatangan (Ka P4M / Staff P4M)
// supaya tidak muncul di teks nama PDF maupun di hasil scan QR code TTD.
function stripGelarDr(nama: string): string {
  return nama.replace(/^\s*dr\.?\s+/i, "").trim();
}

export type PdfKategori = "harian" | "mingguan" | "bulanan" | "tahunan";

// Base URL backend (tanpa /api) — dipakai untuk membangun URL gambar lampiran
// hasil tindak lanjut (foto perbaikan dari Kepala Unit) dan gambar tanda tangan.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

function getUploadUrl(file: string | null | undefined): string | null {
  if (!file) return null;
  if (file.startsWith("http://") || file.startsWith("https://")) return file;
  if (file.startsWith("uploads/")) return `${BASE_URL}/${file}`;
  return `${BASE_URL}/uploads/${file}`;
}

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
  .footer { margin-top:16px; display:flex; justify-content:space-between; align-items:flex-end; font-size:9pt; color:#6b7280; border-top:1px solid #e5e7eb; padding-top:8px; }
  .ttd { text-align:center; }
  .ttd .name { margin-top:64px; font-weight:700; border-top:1px solid #333; padding-top:4px; width:180px; margin:64px auto 0; }
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
  .hasil-img { display:block; margin-top:5px; max-width:90px; max-height:70px; object-fit:cover; border:1px solid #cbd5e1; border-radius:3px; }
  .hasil-img-cap { display:block; font-size:7.5pt; color:#94a3b8; font-style:italic; margin-top:1px; }
  .ttd .signature-img { display:block; max-height:58px; max-width:170px; margin:8px auto 2px; object-fit:contain; }
  .ttd .signature-placeholder { height:64px; }
  .ttd .qr-img { display:block; width:88px; height:88px; margin:8px auto 2px; }
  .ttd .qr-cap { display:block; font-size:7pt; color:#94a3b8; font-style:italic; margin-top:2px; }
  .close-btn { position:fixed; top:14px; right:16px; z-index:999; display:flex; align-items:center; gap:6px;
    padding:8px 14px; background:#4d5e71; color:#fff; border:none; border-radius:6px; font-size:9pt; font-weight:bold;
    cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.25); font-family:Arial,sans-serif; }
  .close-btn:hover { background:#3a4d5e; }
  @media print { body { padding:8px; } @page { size:A4 landscape; margin:12mm; } tr { page-break-inside:avoid; } .close-btn { display:none !important; } }
`;

// ─── FIX: window PDF TIDAK auto-close lagi ──────────────────────
// Sebelumnya dipasang auto-close via event 'afterprint', tapi ini
// menyebabkan bug: begitu user pilih "Save as PDF" (bukan Cancel),
// proses simpan file di OS/browser masih berjalan di belakang layar
// saat 'afterprint' ditembak duluan → window dipaksa close() padahal
// dialog simpan file belum selesai → nge-freeze/error.
// Sekarang window dibiarkan terbuka apa pun aksinya (print/save/cancel),
// dan user tutup sendiri lewat tombol "✕ Tutup" di pojok halaman.
function printWindow(html: string) {
  // Buka window seukuran layar penuh (bukan ukuran tetap 1100x750) supaya
  // panel "Print Preview" browser menutupi seluruh konten halaman —
  // sebelumnya window kecil menyebabkan sisa konten di bawah "nongol"
  // dan terlihat seperti ada 2 lapisan/QR code dobel saat preview cetak.
  const w = window.screen.availWidth;
  const h = window.screen.availHeight;
  const win = window.open("", "_blank", `width=${w},height=${h},left=0,top=0`);
  if (!win) {
    alert("Popup diblokir browser. Izinkan popup untuk mencetak PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
}

// ─── Script + tombol tutup manual — dipakai di setiap HTML template ──
const PRINT_SCRIPT = `
<script>
  window.onload = function() {
    window.print();
  };
</script>
`;

const CLOSE_BUTTON = `<button class="close-btn" onclick="window.close()" title="Tutup halaman ini">✕ Tutup</button>`;

// ═══════════════════════════════════════════════════════════════
// 1. PDF REKAPITULASI — per kategori waktu
// ═══════════════════════════════════════════════════════════════
export async function exportPDFRekap(
  rekapData: RekapItem[],
  prosesData: ProsesItem[],
  kategori: PdfKategori,
  selectedDate: Date,
  penandatangan?: { nama?: string | null; tandaTangan?: string | null } | null
) {
  function isInRange(iso: string | null): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    if (kategori === "harian")   return sameDay(d, selectedDate);
    if (kategori === "mingguan") return sameWeekOfMonth(d, selectedDate);
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

  const mingguIni = getWeekOfMonth(selectedDate);
  const labelKat: Record<PdfKategori, string> = {
    harian:   `Tanggal ${fmtTgl(selectedDate.toISOString())}`,
    mingguan: `Minggu ${mingguIni.weekNum} ${BULAN_PANJANG[selectedDate.getMonth()]} ${selectedDate.getFullYear()} (${mingguIni.start.getDate()}–${mingguIni.end.getDate()} ${BULAN_PANJANG[selectedDate.getMonth()]})`,
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
    lampiranHasil: d.lampiran_hasil ?? null,
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
    lampiranHasil: p.lampiran_hasil ?? null,
    tgl: fmtTgl(p.tanggal_pelaksanaan),
    statusReview: p.status_review ?? "",
    isSelesai: false,
  }));

  const allRows = [...selesaiRows, ...dipantauRows];

  const jabatanPenandatanganRekap = stripGelarDr(penandatangan?.nama?.trim() || "Ka P4M");
  const tglCetakRekap = fmtTglWaktu(new Date().toISOString());
  const qrTextRekap = `LAPORAN REKAPITULASI TUNTAS - Polibatam\nPeriode: ${labelKat[kategori]}\nPenandatangan: ${jabatanPenandatanganRekap}\nDicetak: ${tglCetakRekap}`;
  const qrDataUrlRekap = await generateQrDataUrl(qrTextRekap);

  // ✅ Sama seperti exportExcel.ts: "Selesai" (rekapData) SELALU tampil
  // "Ditindaklanjuti", "Masih Dipantau" (dipantauData) SELALU tampil
  // "Menunggu / Proses" — nggak lihat raw status_review lagi, supaya
  // nggak ada satu tabel yang isinya campur dua label berbeda.
  function badgeReview(isSelesai: boolean) {
    return isSelesai
      ? `<span class="badge badge-green">✓ Ditindaklanjuti</span>`
      : `<span class="badge badge-yellow">⏳ Menunggu / Proses</span>`;
  }

  const tableRows = allRows.map((r) => {
    const gambarUrl = getUploadUrl(r.lampiranHasil);
    return `
    <tr>
      <td class="center">${r.no}</td>
      <td class="center" style="font-weight:bold;font-size:8pt">${r.kode}</td>
      <td>${r.jenis}</td>
      <td>${r.uraian}</td>
      <td class="center">${r.unit}</td>
      <td>${r.penyebab}</td>
      <td>${r.rencana}</td>
      <td>
        ${r.hasil}
        ${gambarUrl ? `
          <img src="${gambarUrl}" class="hasil-img" alt="Foto hasil perbaikan" onerror="this.style.display='none';this.nextElementSibling.style.display='none'"/>
          <span class="hasil-img-cap">Foto hasil perbaikan Kepala Unit</span>
        ` : ""}
      </td>
      <td class="center">${r.tgl}</td>
      <td class="center">${badgeReview(r.isSelesai)}</td>
      <td class="center">
        <span class="badge ${r.isSelesai ? "badge-blue" : "badge-yellow"}">
          ${r.isSelesai ? "Selesai" : "Dipantau"}
        </span>
      </td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"/>
<title>Rekap — ${labelKat[kategori]}</title>
<style>${BASE_CSS}</style>
</head><body>
${CLOSE_BUTTON}
<div class="header">
  <h1>TUNTAS — Politeknik Negeri Batam</h1>
  <h2>Laporan Rekapitulasi Ketidaksesuaian</h2>
  <p>Periode: <strong>${labelKat[kategori]}</strong></p>
  <p>Dicetak: ${fmtTglWaktu(new Date().toISOString())}</p>
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
    <p style="margin-top:4px;">Kepala P4M,</p>
    ${
      qrDataUrlRekap
        ? `<img src="${qrDataUrlRekap}" class="qr-img" alt="QR TTD Kepala P4M"/><span class="qr-cap">Scan untuk verifikasi TTD</span>`
        : `<div class="signature-placeholder"></div>`
    }
    <div class="name" style="margin-top:4px;">( ${jabatanPenandatanganRekap} )</div>
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

export async function exportPDFProses(
  item: ProsesDetailItem,
  penandatangan?: { nama?: string | null; tandaTangan?: string | null } | null
) {
  // Parameter 'penandatangan' sengaja tidak dipakai lagi di bawah — label
  // penandatangan di bagian ini sudah di-hardcode "Staff P4M" (lihat
  // jabatanPenandatanganProses). Parameter tetap dipertahankan di signature
  // supaya pemanggil (ProcessMonitorTable.tsx) yang masih mengirim 2 argumen
  // tidak perlu diubah.
  void penandatangan;

  const gambarHasilUrl = getUploadUrl(item.lampiran_hasil);
  // Sengaja di-hardcode "Staff P4M" (bukan ikut nama akun individu, mis.
  // "Admin Staf P4M") — baik untuk teks yang dicetak maupun yang di-encode
  // ke QR, supaya tidak ada kata "Admin" muncul di bagian Proses & Pantau ini.
  const jabatanPenandatanganProses = "Staff P4M";
  const tglCetakProses = fmtTglWaktu(new Date().toISOString());
  const qrTextProses = `LAPORAN TUNTAS - Polibatam\nKode: ${item.kode_laporan}\nPenandatangan: ${jabatanPenandatanganProses}\nDicetak: ${tglCetakProses}`;
  const qrDataUrlProses = await generateQrDataUrl(qrTextProses);

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
  .box-img { display:block; margin-top:10px; max-width:260px; max-height:200px; object-fit:cover; border:1px solid #cbd5e1; border-radius:4px; }
  .box-img-cap { display:block; font-size:8pt; color:#94a3b8; font-style:italic; margin-top:4px; }
  @media print { @page { size:A4 portrait; margin:15mm; } }
</style>
</head><body>
${CLOSE_BUTTON}
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
  <div class="box">
    ${item.hasil_tindakan ?? "<em style='color:#9ca3af'>Belum ada hasil</em>"}
    ${gambarHasilUrl ? `
      <img src="${gambarHasilUrl}" class="box-img" alt="Foto hasil perbaikan" onerror="this.style.display='none';this.nextElementSibling.style.display='none'"/>
      <span class="box-img-cap">Foto hasil perbaikan dari Kepala Unit</span>
    ` : ""}
  </div>
</div>

<div class="footer">
  <div><p>Dokumen digenerate otomatis oleh sistem TUNTAS Polibatam.</p></div>
  <div class="ttd">
    <p>Batam, ${fmtTgl(new Date().toISOString())}</p>
    <p style="margin-top:4px;">Staff P4M,</p>
    ${
      qrDataUrlProses
        ? `<img src="${qrDataUrlProses}" class="qr-img" alt="QR TTD Staff P4M"/><span class="qr-cap">Scan untuk verifikasi TTD</span>`
        : `<div class="signature-placeholder"></div>`
    }
    <div class="name" style="margin-top:4px;">( ${jabatanPenandatanganProses} )</div>
  </div>
</div>
${PRINT_SCRIPT}
</body></html>`;

  printWindow(html);
}

// ═══════════════════════════════════════════════════════════════
// 3. PDF RIWAYAT KEPALA UNIT — per laporan individual, TTD Kepala Unit
//    (sama strukturnya dengan exportPDFProses milik Staf P4M, tapi
//    penandatangannya "Kepala Unit — {unit}", dipakai oleh tab Riwayat
//    di halaman Kepala Unit)
// ═══════════════════════════════════════════════════════════════
export interface RiwayatKepalaUnitItem {
  kode_laporan: string;
  jenis_laporan: string | null;
  isi_laporan: string | null;
  nama_unit: string | null;
  status_boxing: string | null;
  status_review: string | null;
  approval_staf: string | null;
  catatan_approval: string | null;
  aksi_masukan: string | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  hasil_tindakan: string | null;
  lampiran_hasil: string | null;
  tanggal_pelaksanaan: string | null;
  tanggal_laporan?: string | null;
}

export async function exportPDFRiwayatKepalaUnit(
  item: RiwayatKepalaUnitItem,
  penandatangan?: { nama?: string | null } | null
) {
  const gambarHasilUrl = getUploadUrl(item.lampiran_hasil);
  const namaUnit = item.nama_unit ?? "—";
  // Sengaja pakai label jabatan generik "Kepala Unit — {unit}" (bukan nama
  // akun pribadi) supaya konsisten dengan pola TTD "Staff P4M" di Proses &
  // Pantau — baik di teks cetak maupun yang di-encode ke QR.
  const jabatanPenandatangan = `Kepala Unit — ${namaUnit}`;
  void penandatangan; // tersedia untuk pemakaian di masa depan (nama individu), tidak dipakai sekarang
  const isSelesai = item.status_boxing === "selesai";
  const statusLabel = isSelesai
    ? "Selesai — Disetujui Staf P4M"
    : "Menunggu Approval Staf P4M";
  const tglCetak = fmtTglWaktu(new Date().toISOString());
  const qrText = `LAPORAN TUNTAS - Polibatam\nKode: ${item.kode_laporan}\nUnit: ${namaUnit}\nStatus: ${statusLabel}\nPenandatangan: ${jabatanPenandatangan}\nDicetak: ${tglCetak}`;
  const qrDataUrl = await generateQrDataUrl(qrText);

  const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"/>
<title>Riwayat ${item.kode_laporan}</title>
<style>
  ${BASE_CSS}
  .section { margin-bottom:14px; }
  .section-title { font-size:10pt; font-weight:bold; color:#4d5e71; border-bottom:2px solid #4d5e71; padding-bottom:4px; margin-bottom:8px; text-transform:uppercase; }
  .field { display:flex; gap:8px; margin-bottom:6px; font-size:9pt; }
  .field .lbl { min-width:140px; font-weight:bold; color:#374151; }
  .field .val { color:#111; flex:1; }
  .box { border:1px solid #e2e8f0; padding:8px 10px; border-radius:4px; background:#f8fafc; font-size:9pt; line-height:1.6; min-height:40px; }
  .box-img { display:block; margin-top:10px; max-width:260px; max-height:200px; object-fit:cover; border:1px solid #cbd5e1; border-radius:4px; }
  .box-img-cap { display:block; font-size:8pt; color:#94a3b8; font-style:italic; margin-top:4px; }
  @media print { @page { size:A4 portrait; margin:15mm; } }
</style>
</head><body>
${CLOSE_BUTTON}
<div class="header">
  <h1>TUNTAS — Politeknik Negeri Batam</h1>
  <h2>Riwayat Laporan Ketidaksesuaian — Kepala Unit</h2>
  <p>Kode: <strong>${item.kode_laporan}</strong> &nbsp;|&nbsp; Dicetak: ${tglCetak}</p>
</div>

<div class="section">
  <div class="section-title">Identitas Laporan</div>
  <div class="field"><span class="lbl">Kode Laporan</span><span class="val">${item.kode_laporan}</span></div>
  <div class="field"><span class="lbl">Jenis</span><span class="val">${item.jenis_laporan ?? "—"}</span></div>
  <div class="field"><span class="lbl">Unit</span><span class="val">${namaUnit}</span></div>
  <div class="field"><span class="lbl">Tanggal Masuk</span><span class="val">${fmtTgl(item.tanggal_laporan ?? null)}</span></div>
  <div class="field"><span class="lbl">Status</span><span class="val">
    <span class="badge ${isSelesai ? "badge-green" : "badge-yellow"}">${isSelesai ? "✓ Selesai" : "⏳ Menunggu Approval Staf P4M"}</span>
  </span></div>
</div>

<div class="section">
  <div class="section-title">Isi Laporan Civitas</div>
  <div class="box">${item.isi_laporan ?? "—"}</div>
</div>

<div class="section">
  <div class="section-title">Analisis Penyebab</div>
  <div class="box">${item.penyebab ?? "<em style='color:#9ca3af'>—</em>"}</div>
</div>

<div class="section">
  <div class="section-title">Rencana Tindakan</div>
  <div class="box">${item.rencana_tindakan ?? "<em style='color:#9ca3af'>—</em>"}</div>
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
  <div class="box">
    ${item.hasil_tindakan ?? "<em style='color:#9ca3af'>Belum ada hasil</em>"}
    ${gambarHasilUrl ? `
      <img src="${gambarHasilUrl}" class="box-img" alt="Foto hasil perbaikan" onerror="this.style.display='none';this.nextElementSibling.style.display='none'"/>
      <span class="box-img-cap">Foto bukti pelaksanaan dari Kepala Unit</span>
    ` : ""}
  </div>
</div>

${isSelesai && item.catatan_approval ? `
<div class="section">
  <div class="section-title">Catatan Persetujuan Staf P4M</div>
  <div class="box" style="background:#f0fdf4;border-color:#bbf7d0">${item.catatan_approval}</div>
</div>` : ""}

<div class="footer">
  <div><p>Dokumen digenerate otomatis oleh sistem TUNTAS Polibatam.</p></div>
  <div class="ttd">
    <p>Batam, ${fmtTgl(new Date().toISOString())}</p>
    <p style="margin-top:4px;">${jabatanPenandatangan},</p>
    ${
      qrDataUrl
        ? `<img src="${qrDataUrl}" class="qr-img" alt="QR TTD Kepala Unit"/><span class="qr-cap">Scan untuk verifikasi TTD</span>`
        : `<div class="signature-placeholder"></div>`
    }
    <div class="name" style="margin-top:4px;">( ${jabatanPenandatangan} )</div>
  </div>
</div>
${PRINT_SCRIPT}
</body></html>`;

  printWindow(html);
}