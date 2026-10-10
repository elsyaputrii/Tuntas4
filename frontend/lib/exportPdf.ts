// FILE: frontend/lib/exportPdf.ts
// Semua fungsi export PDF untuk Staf P4M
// Dipakai oleh:
//   - RecapitulationTable.tsx  → exportPDFRekap (per harian/mingguan/bulanan/tahunan)
//   - ProcessMonitorTable.tsx  → exportPDFProses (per laporan individual)
//   - RiwayatTable.tsx         → exportPDFRiwayatKepalaUnit (per laporan individual Kepala Unit)

import QRCode from "qrcode";
import type { RekapItem, ProsesItem, ArsipItem } from "./exportTypes";
import {
  fmtTgl,
  fmtTglWaktu,
  labelStatusReview,
  labelStatusBoxing,
  getWeekOfMonth,
  sameWeekOfMonth,
  sameDay,
} from "./exportHelpers";

// ─── QR Code TTE ─────────────────────────────────────────────
// QR berisi info TTE (TTE oleh / Perihal / Hashing) — di-scan pakai
// kamera/QR scanner apa pun untuk menampilkan info TTE-nya.
async function generateQrDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, {
      width: 260,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#111111", light: "#ffffff" },
    });
  } catch {
    return null; // nonfatal — PDF tetap bisa dicetak tanpa QR
  }
}

// ─── HELPER TTE ─────────────────────────────────────────────
// Format tanggal Indonesia: "24 Juli 2026"
function formatTanggalIndonesia(d: Date): string {
  const bulan = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember",
  ];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

// Hash SHA-256 (hex) — pakai Web Crypto API (bawaan browser modern)
async function sha256Hex(text: string): Promise<string> {
  try {
    const buf = new TextEncoder().encode(text);
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // Fallback super-sederhana kalau crypto.subtle tidak tersedia (harusnya
    // tidak pernah terjadi di browser modern). Tetap deterministic.
    let h = 0;
    for (let i = 0; i < text.length; i++) {
      h = (h << 5) - h + text.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(16).padStart(64, "0");
  }
}

/**
 * Bangun teks QR TTE dengan format:
 *
 *   TTE oleh:
 *   <nama penandatangan>
 *   <tanggal Indonesia>
 *
 *   Perihal:
 *   <jenis> — <kode/periode>
 *
 *   Hashing:
 *   <hash baris 1 (40 char)>
 *   <hash baris 2 (24 char)>
 */
async function buildQrTteText(opts: {
  penandatangan: string;
  perihal: string;
  hashSeed: string;
  tanggal?: Date;
}): Promise<string> {
  const tgl = opts.tanggal ?? new Date();
  const hash = await sha256Hex(opts.hashSeed);
  const hashBaris1 = hash.slice(0, 40);
  const hashBaris2 = hash.slice(40);

  return [
    "TTE oleh:",
    opts.penandatangan,
    formatTanggalIndonesia(tgl),
    "",
    "Perihal:",
    opts.perihal,
    "",
    "Hashing:",
    hashBaris1,
    hashBaris2,
  ].join("\n");
}

// Menghapus gelar "Dr." di depan nama penandatangan
function stripGelarDr(nama: string): string {
  return nama.replace(/^\s*dr\.?\s+/i, "").trim();
}

export type PdfKategori = "harian" | "mingguan" | "bulanan" | "tahunan";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";
const LOGO_POLIBATAM_URL = "/logo-polibatam.png";

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
  body { font-family:Arial,sans-serif; font-size:10pt; color:#111; padding:34px 30px; }
  .header-borang { display:flex; flex-direction:row; align-items:center; gap:14px; width:100%; margin-bottom:18px; border-bottom:3px double #111; padding-bottom:12px; page-break-inside:avoid; break-inside:avoid; }
  .header-borang .logo { display:block; flex:0 0 80px; width:80px; height:80px; max-width:80px; object-fit:contain; }
  .header-borang .title-container { flex:1; min-width:0; text-align:center; font-weight:700;}
  .header-borang .doc-number { font-weight:700; white-space:nowrap; }
  .header-borang .doc-title-text { text-decoration:underline; }
  .header-borang .doc-date { font-size:9pt; font-weight:700; color:#000; margin-top:4px; }
  .header-borang .doc-subtitle { font-size:8.5pt; color:#555; margin-top:3px; line-height:1.4; }

  .footer { margin-top:16px; display:flex; justify-content:space-between; align-items:flex-end; gap:16px; font-size:9pt; color:#6b7280; border-top:1px solid #e5e7eb; padding-top:8px; }
  .ttd { text-align:center; flex-shrink:0; }
  .ttd .name { margin-top:64px; font-weight:700; border-top:1px solid #333; padding-top:4px; width:180px; margin:64px auto 0; }

  table { width:100%; border-collapse:collapse; font-size:9pt; }
  thead tr { background:#4d5e71; color:#fff; }
  thead th { padding:6px 5px; text-align:center; font-weight:700; border:1px solid #3a4d5e; }
  tbody tr:nth-child(even) { background:#f8fafc; }
  tbody td { padding:5px; border:1px solid #e2e8f0; vertical-align:top; line-height:1.4; overflow-wrap:break-word; }

  .center { text-align:center; }
  .badge { display:inline-block; padding:2px 6px; border-radius:3px; font-size:8pt; font-weight:bold; }
  .badge-green { background:#d1fae5; color:#065f46; }
  .badge-red { background:#fee2e2; color:#991b1b; }
  .badge-yellow { background:#fef3c7; color:#92400e; }
  .badge-blue { background:#dbeafe; color:#1e40af; }
  .badge-gray { background:#f3f4f6; color:#374151; }

  .hasil-img { display:block; margin-top:5px; max-width:90px; max-height:70px; object-fit:cover; border:1px solid #cbd5e1; border-radius:3px; }
  .hasil-img-cap { display:block; font-size:7.5pt; color:#94a3b8; font-style:italic; margin-top:1px; }
  .ttd .signature-img { display:block; max-height:58px; max-width:170px; margin:8px auto 2px; object-fit:contain; }
  .ttd .signature-placeholder { height:64px; }
  .ttd .qr-img { display:block; width:110px; height:110px; margin:8px auto 2px; }
  .ttd .qr-cap { display:block; font-size:7pt; color:#94a3b8; font-style:italic; margin-top:2px; }

  .close-btn { position:fixed; top:14px; right:16px; z-index:999; display:flex; align-items:center; gap:6px; padding:8px 14px; background:#4d5e71; color:#fff; border:none; border-radius:6px; font-size:9pt; font-weight:bold; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.25); font-family:Arial,sans-serif; }
  .close-btn:hover { background:#3a4d5e; }

  @media print {
    body { padding:32px; padding-top:20px; }
    @page { size:A4 landscape; margin:18mm; }
    tr { page-break-inside:avoid; break-inside:avoid; }
    .header-borang { page-break-inside:avoid; break-inside:avoid; }
    .footer, .ttd { page-break-inside:avoid; break-inside:avoid; }
    .close-btn { display:none !important; }
  }
`;

function printWindow(html: string) {
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

const PRINT_SCRIPT = `
<script>
  window.onload = function() {
    window.print();
  };
</script>
`;

const CLOSE_BUTTON = `<button class="close-btn" onclick="window.close()" title="Tutup halaman ini">✕ Tutup</button>`;

function renderHeaderBorang(subtitleInfo?: string) {
  return `
  <div class="header-borang">
    <img src="${LOGO_POLIBATAM_URL}" alt="Logo Polibatam" class="logo" />
    <div class="title-container">
      <div class="doc-title">
        No.BO.34.3.1-V6 Borang Registrasi Ketidaksesuaian dan Permintaan
        <br />
        Tindakan Koreksi/Pencegahan
      </div>
      <div class="doc-date">23 September 2020</div>
      ${subtitleInfo ? `<div class="doc-subtitle">${subtitleInfo}</div>` : ""}
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// 1. PDF REKAPITULASI
// ═══════════════════════════════════════════════════════════════
export async function exportPDFRekap(
  rekapData: RekapItem[],
  prosesData: ProsesItem[],
  kategori: PdfKategori,
  selectedDate: Date,
  penandatangan?: { nama?: string | null; tandaTangan?: string | null } | null,
  arsipData: ArsipItem[] = []
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
  const filteredArsip = arsipData.filter((a) => isInRange(a.tgl_pelaksanaan ?? a.tgl_masuk ?? null));

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

  const arsipRows = filteredArsip.map((a) => ({
    no: 0,
    kode: a.kode_laporan ?? "—",
    jenis: a.jenis_laporan ?? "—",
    uraian: a.uraian_ketidaksesuaian ?? "—",
    unit: a.unit ?? "—",
    penyebab: a.penyebab ?? "—",
    rencana: a.rencana_tindakan ?? "—",
    hasil: a.hasil_tindakan ?? "—",
    lampiranHasil: null as string | null,
    tgl: fmtTgl(a.tgl_pelaksanaan ?? a.tgl_masuk),
    statusReview: a.status_review ?? "",
    isSelesai:
      a.status_boxing === "selesai" ||
      a.status_boxing?.toLowerCase() === "closed",
  }));

  const allRows = [...selesaiRows, ...dipantauRows, ...arsipRows]
    .map((r, i) => ({ ...r, no: i + 1 }));

  const jabatanPenandatanganRekap = stripGelarDr(penandatangan?.nama?.trim() || "Kepala P4M");
  const tglCetakRekap = fmtTglWaktu(new Date().toISOString());

  // ✅ TTE format baru
  const qrTextRekap = await buildQrTteText({
    penandatangan: jabatanPenandatanganRekap,
    perihal: `Laporan Rekapitulasi TUNTAS — ${labelKat[kategori]}`,
    hashSeed: `REKAP|${kategori}|${labelKat[kategori]}|${allRows.length} laporan|${tglCetakRekap}`,
  });
  const qrDataUrlRekap = await generateQrDataUrl(qrTextRekap);

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
${renderHeaderBorang(`Periode: <strong>${labelKat[kategori]}</strong> | Dicetak: ${tglCetakRekap}`)}
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
        ? `<img src="${qrDataUrlRekap}" class="qr-img" alt="QR TTE Kepala P4M"/><span class="qr-cap">Scan untuk verifikasi TTE</span>`
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
  void penandatangan;

  const gambarHasilUrl = getUploadUrl(item.lampiran_hasil);
  const jabatanPenandatanganProses = "Staff P4M";
  const tglCetakProses = fmtTglWaktu(new Date().toISOString());

  // ✅ TTE format baru
  const qrTextProses = await buildQrTteText({
    penandatangan: jabatanPenandatanganProses,
    perihal: `${item.jenis_laporan ?? "Laporan"} — ${item.kode_laporan}`,
    hashSeed: `PROSES|${item.kode_laporan}|${item.isi_laporan ?? ""}|${item.tanggal_pelaksanaan ?? ""}|${tglCetakProses}`,
  });
  const qrDataUrlProses = await generateQrDataUrl(qrTextProses);

  const hasilTindakLanjutPdf =
  item.hasil_tindakan
    ? item.hasil_tindakan
    : item.status_boxing === "selesai"
      ? `<em style="color:#9ca3af">Sudah sesuai, tidak ditindaklanjuti</em>`
      : `<em style="color:#9ca3af">Belum ada hasil</em>`;

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
${renderHeaderBorang(`Kode Laporan: <strong>${item.kode_laporan}</strong> | Dicetak: ${tglCetakProses}`)}

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
    ${hasilTindakLanjutPdf}
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
        ? `<img src="${qrDataUrlProses}" class="qr-img" alt="QR TTE Staff P4M"/><span class="qr-cap">Scan untuk verifikasi TTE</span>`
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
// 3. PDF RIWAYAT KEPALA UNIT
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
  const jabatanPenandatangan = `Kepala Unit — ${namaUnit}`;
  void penandatangan;
  const isSelesai = item.status_boxing === "selesai";
  const hasilTindakLanjutPdf =
  item.hasil_tindakan
    ? item.hasil_tindakan
    : isSelesai
      ? `<em style="color:#9ca3af">Sudah sesuai, tidak ditindaklanjuti</em>`
      : `<em style="color:#9ca3af">Belum ada hasil</em>`;

  const statusLabel = isSelesai
    ? "Selesai — Disetujui Staf P4M"
    : "Dalam Proses";
  const tglCetak = fmtTglWaktu(new Date().toISOString());

  // ✅ TTE format baru
  const qrText = await buildQrTteText({
    penandatangan: jabatanPenandatangan,
    perihal: `${item.jenis_laporan ?? "Laporan"} — ${item.kode_laporan}`,
    hashSeed: `RIWAYAT|${item.kode_laporan}|${namaUnit}|${statusLabel}|${tglCetak}`,
  });
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
${renderHeaderBorang(`Kode: <strong>${item.kode_laporan}</strong> | Dicetak: ${tglCetak}`)}

<div class="section">
  <div class="section-title">Identitas Laporan</div>
  <div class="field"><span class="lbl">Kode Laporan</span><span class="val">${item.kode_laporan}</span></div>
  <div class="field"><span class="lbl">Jenis</span><span class="val">${item.jenis_laporan ?? "—"}</span></div>
  <div class="field"><span class="lbl">Unit</span><span class="val">${namaUnit}</span></div>
  <div class="field"><span class="lbl">Tanggal Masuk</span><span class="val">${fmtTgl(item.tanggal_laporan ?? null)}</span></div>
  <div class="field"><span class="lbl">Status</span><span class="val">
    <span class="badge ${isSelesai ? "badge-green" : "badge-yellow"}">${isSelesai ? "✓ Selesai" : "⏳ Dalam Proses"}</span>
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
  ${hasilTindakLanjutPdf}
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
        ? `<img src="${qrDataUrl}" class="qr-img" alt="QR TTE Kepala Unit"/><span class="qr-cap">Scan untuk verifikasi TTE</span>`
        : `<div class="signature-placeholder"></div>`
    }
    <div class="name" style="margin-top:4px;">( ${jabatanPenandatangan} )</div>
  </div>
</div>
${PRINT_SCRIPT}
</body></html>`;

  printWindow(html);
}