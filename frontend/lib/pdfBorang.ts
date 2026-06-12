// FILE: frontend/app/lib/pdfBorang.ts
// Generator PDF Borang Resmi TUNTAS Polibatam

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtTgl(val: string | null, withTime = false): string {
  if (!val) return "—";
  const d = new Date(val);
  const dateStr = d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  if (!withTime) return dateStr;
  return (
    dateStr +
    ", " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  );
}

function bulanRange(items: { created_at?: string | null }[]): string {
  const dates = items
    .map((i) => (i.created_at ? new Date(i.created_at) : null))
    .filter(Boolean) as Date[];
  if (!dates.length) return "—";
  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));
  const fmt = (d: Date) =>
    d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  if (fmt(min) === fmt(max)) return fmt(min);
  return `${fmt(min)} s.d. ${fmt(max)}`;
}

// ─── FIX: printWindow sekarang daftarkan afterprint → close ─────────────────
// Bug sebelumnya: popup tidak pernah ditutup setelah print dialog selesai.
// Akibatnya Next.js router bingung dan halaman parent loading terus / hilang.
function printWindow(html: string) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Popup diblokir browser. Izinkan popup untuk mencetak borang.");
    return;
  }
  win.document.write(html);
  win.document.close();

  // Tutup popup otomatis setelah user selesai dengan dialog print
  win.addEventListener("afterprint", () => {
    win.close();
  });
}

// ─── Script tag yang dipakai di setiap HTML template ────────────────────────
// afterprint sudah handle close lewat addEventListener di printWindow,
// tapi kita tambah juga di dalam HTML sebagai fallback untuk browser lama.
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

// ── Shared CSS ────────────────────────────────────────────────────────────────

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    color: #000;
    background: #fff;
    padding: 20mm 20mm 15mm 25mm;
  }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; }
  .no-border td { border: none; }
  .header-table td { border: 1px solid #000; }
  .bold { font-weight: bold; }
  .center { text-align: center; }
  .right { text-align: right; }
  .small { font-size: 9pt; }
  .italic { font-style: italic; }
  .ttd-area { height: 60px; }
  .section-label { font-weight: bold; padding: 4px 6px; border: 1px solid #000; background: #f5f5f5; }
  h1 { font-size: 13pt; font-weight: bold; }
  h2 { font-size: 11pt; font-weight: bold; }
  .kop-kanan { font-size: 10pt; text-align: right; }
  .nomor-borang { font-size: 10pt; font-weight: bold; }
  .footer-note { font-size: 9pt; margin-top: 8px; }
  @media print {
    body { padding: 10mm 15mm 10mm 20mm; }
    @page { size: A4 portrait; margin: 0; }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════
// BORANG 1 — Registrasi Ketidaksesuaian (per laporan)
// ═══════════════════════════════════════════════════════════════════════════

export interface BorangRegistrasiData {
  kode_laporan: string;
  created_at: string | null;
  nama_unit: string | null;
  status_pelapor: string | null;
  isi_laporan: string | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  tanggal_pelaksanaan: string | null;
  hasil_tindakan: string | null;
  status_boxing: string | null;
  status_review: string | null;
}

export function cetakBorangRegistrasi(data: BorangRegistrasiData): void {
  const isSelesai = data.status_boxing === "selesai";
  const verifikasi = isSelesai ? "1" : "2";

  const labelStatusPelapor: Record<string, string> = {
    mahasiswa: "Mahasiswa",
    dosen: "Dosen / Tendik",
    tendik: "Tendik",
    masyarakat: "Masyarakat Umum",
  };

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <title>Borang Registrasi — ${data.kode_laporan}</title>
  <style>
    ${BASE_CSS}
    .content-cell { min-height: 60px; }
    .sign-cell { width: 160px; text-align: center; }
    .verif-cell { width: 120px; }
    .row-tall td { height: 70px; }
  </style>
</head>
<body>

  <table class="header-table" style="margin-bottom:4px;">
    <tr>
      <td style="width:70%; border-right:1px solid #000; padding:6px 8px;">
        <h1>BORANG REGISTRASI KETIDAKSESUAIAN</h1>
        <h2>DAN PERMINTAAN TINDAKAN KOREKSI/PENCEGAHAN</h2>
        <p style="margin-top:4px; font-size:10pt;">POLITEKNIK NEGERI BATAM — P4M</p>
      </td>
      <td style="padding:6px 8px; vertical-align:middle;">
        <p class="nomor-borang">No.BO.34.3.1-V6</p>
        <p class="small" style="margin-top:4px;">23 September 2020</p>
        <p class="small" style="margin-top:8px; font-style:italic;">Dicetak via TUNTAS</p>
        <p class="small">${fmtTgl(new Date().toISOString())}</p>
      </td>
    </tr>
  </table>

  <table style="margin-bottom:0;">
    <tr>
      <td style="width:40%; font-weight:bold; background:#fafafa;">Nomor Registrasi Borang</td>
      <td>: <strong>${data.kode_laporan}</strong></td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#fafafa;">Tanggal Masuk</td>
      <td>: ${fmtTgl(data.created_at, true)}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#fafafa;">Kepala Bagian / Unit yang Dituju</td>
      <td>: ${data.nama_unit ?? "—"}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#fafafa;">Nama dan Identitas Pelapor <sup>1)</sup></td>
      <td>: Anonim (${labelStatusPelapor[data.status_pelapor ?? ""] ?? data.status_pelapor ?? "—"})</td>
    </tr>
  </table>

  <table style="margin-top:4px;">
    <tr>
      <td colspan="2" class="section-label">
        Uraian Ketidaksesuaian atau Saran <em>(diisi oleh Pelapor)</em> :
      </td>
    </tr>
    <tr class="row-tall">
      <td class="content-cell" style="width:75%; min-height:80px;">
        ${data.isi_laporan ?? "—"}
      </td>
      <td class="sign-cell">
        <div style="font-weight:bold; margin-bottom:4px;">Tanda Tangan Pelapor</div>
        <div class="ttd-area"></div>
        <div class="italic small">(Anonim — tidak diperlukan)</div>
      </td>
    </tr>
  </table>

  <table style="margin-top:4px;">
    <tr>
      <td class="section-label">
        Penyebab <em>(diisi oleh Kabag/Unit Terlapor)</em> :
      </td>
    </tr>
    <tr>
      <td class="content-cell" style="min-height:70px; padding:8px 6px;">
        ${data.penyebab ?? "<em style='color:#888'>Belum diisi</em>"}
      </td>
    </tr>
  </table>

  <table style="margin-top:4px;">
    <tr>
      <td class="section-label" style="width:65%;">
        Rencana Tindakan Koreksi/Pencegahan <em>(diisi oleh Kabag/Unit Terlapor)</em> :
      </td>
      <td class="section-label" style="width:35%; text-align:center;">
        Tanggal Batas Pelaksanaan Tindakan Koreksi
      </td>
    </tr>
    <tr>
      <td class="content-cell" style="min-height:70px; padding:8px 6px;">
        ${data.rencana_tindakan ?? "<em style='color:#888'>Belum diisi</em>"}
      </td>
      <td class="content-cell" style="text-align:center; vertical-align:middle; font-weight:bold;">
        ${fmtTgl(data.tanggal_pelaksanaan)}
      </td>
    </tr>
  </table>

  <table style="margin-top:4px;">
    <tr>
      <td class="section-label" style="width:40%;">
        Review Tindakan Koreksi <em>(diisi oleh P4M)</em> <sup>2)</sup>
      </td>
      <td class="section-label" style="width:35%; text-align:center;">
        Verifikasi Tindakan Koreksi <sup>3)</sup> <em>(diisi oleh P4M)</em>
      </td>
      <td class="section-label" style="width:25%; text-align:center;">
        Tanggal Verifikasi &amp; Paraf
      </td>
    </tr>
    <tr>
      <td class="content-cell" style="min-height:80px; padding:8px 6px;">
        ${data.hasil_tindakan ?? "<em style='color:#888'>Belum ada hasil tindak lanjut</em>"}
      </td>
      <td style="vertical-align:middle; padding:8px;">
        <table style="border:none; width:100%;">
          <tr>
            <td style="border:none; width:24px; text-align:center;">
              <strong style="font-size:16pt; color:${verifikasi === "1" ? "#000" : "#ccc"};">
                ${verifikasi === "1" ? "✗" : ""}
              </strong>
            </td>
            <td style="border:none;">1&ensp;Sesuai</td>
          </tr>
          <tr style="margin-top:4px;">
            <td style="border:none; text-align:center;">
              <strong style="font-size:16pt; color:${verifikasi === "2" ? "#000" : "#ccc"};">
                ${verifikasi === "2" ? "✗" : ""}
              </strong>
            </td>
            <td style="border:none;">2&ensp;Perbaikan Berkelanjutan <sup>4)</sup></td>
          </tr>
        </table>
      </td>
      <td style="vertical-align:top; padding:8px; text-align:center;">
        <div style="margin-bottom:4px;"><strong>P4M</strong></div>
        <div class="ttd-area" style="height:40px; border-bottom:1px solid #000;"></div>
        <div style="margin-top:8px;"><strong>Kabag/Unit</strong></div>
        <div class="ttd-area" style="height:40px; border-bottom:1px solid #000;"></div>
      </td>
    </tr>
  </table>

  <div class="footer-note" style="margin-top:10px; border-top:1px solid #000; padding-top:6px;">
    <p>1) Boleh diisi, boleh tidak. Jika tidak diisi, maka diregistrasi oleh P4M.</p>
    <p>2) Diisi dengan hasil tindakan koreksi dan pencegahan.</p>
    <p>3) Pilih salah satu dengan menyilang angka 1 atau 2.</p>
    <p>4) Registrasi Ulang.</p>
  </div>

  ${PRINT_SCRIPT}
</body>
</html>`;

  printWindow(html);
}

// ═══════════════════════════════════════════════════════════════════════════
// BORANG 2 — Rekapitulasi Ketidaksesuaian (semua data)
// ═══════════════════════════════════════════════════════════════════════════

export interface RekapItem {
  id_laporan: number;
  id_boxing: number;
  kode_laporan: string;
  jenis_laporan: string | null;
  uraian_ketidaksesuaian: string | null;
  lampiran_laporan: string | null;
  status_laporan: string | null;
  nama_unit: string | null;
  status_review: string | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  hasil_tindakan: string | null;
  lampiran_hasil: string | null;
  tanggal_pelaksanaan: string | null;
  created_at?: string | null;
}

export function cetakBorangRekapitulasi(data: RekapItem[]): void {
  const periode = bulanRange(data as { created_at?: string | null }[]);
  const tglCetak = fmtTgl(new Date().toISOString());

  const rows = data
    .map((item, idx) => {
      const isSelesai = item.status_laporan === "selesai";
      const jenisLabel =
        item.jenis_laporan === "masukan"
          ? "Masukan"
          : item.jenis_laporan === "kritik"
          ? "Kritik"
          : item.jenis_laporan === "pengaduan"
          ? "Pengaduan"
          : item.jenis_laporan ?? "—";

      return `
      <tr>
        <td class="center" style="width:4%;">${idx + 1}</td>
        <td style="width:11%; font-size:9pt;">${fmtTgl(item.created_at ?? null)}</td>
        <td style="width:13%; font-size:9pt;">${item.nama_unit ?? "—"}</td>
        <td style="width:30%; font-size:9pt;">${item.uraian_ketidaksesuaian ?? "—"}</td>
        <td class="center" style="width:10%; font-size:9pt;">${jenisLabel}</td>
        <td class="center" style="width:10%; font-size:9pt;">
          <span style="
            display:inline-block; padding:2px 6px; border-radius:3px;
            background:${isSelesai ? "#d1fae5" : "#fef3c7"};
            color:${isSelesai ? "#065f46" : "#92400e"};
            font-weight:bold; font-size:8pt;
          ">${isSelesai ? "Close" : "Open"}</span>
        </td>
        <td class="center" style="width:12%; font-size:9pt;">${fmtTgl(item.tanggal_pelaksanaan)}</td>
      </tr>`;
    })
    .join("");

  const emptyRows = Math.max(0, 12 - data.length);
  const emptyRowHtml = Array.from(
    { length: emptyRows },
    () => `
    <tr style="height:22px;">
      <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>`
  ).join("");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <title>Borang Rekapitulasi Ketidaksesuaian — ${periode}</title>
  <style>
    ${BASE_CSS}
    body { font-size: 10pt; }
    table { font-size: 10pt; }
    .rekap-header { margin-bottom: 8px; }
    @media print {
      @page { size: A4 landscape; margin: 10mm 15mm; }
    }
  </style>
</head>
<body>

  <table class="header-table rekap-header">
    <tr>
      <td style="width:72%; padding:8px 10px; border-right:1px solid #000;">
        <h1 style="font-size:14pt;">BORANG REKAPITULASI KETIDAKSESUAIAN</h1>
        <p style="margin-top:4px;">POLITEKNIK NEGERI BATAM — P4M (Penjaminan Mutu)</p>
      </td>
      <td style="padding:8px 10px; vertical-align:middle; text-align:right;">
        <p class="nomor-borang">No.BO.34.3.2-V2</p>
        <p class="small" style="margin-top:4px;">8 April 2025</p>
        <p class="small" style="margin-top:8px; font-style:italic;">Dicetak via TUNTAS</p>
        <p class="small">${tglCetak}</p>
      </td>
    </tr>
  </table>

  <p style="margin-bottom:8px; font-weight:bold;">
    Periode: <span style="border-bottom:1px solid #000; padding:0 40px;">${periode}</span>
  </p>

  <table>
    <thead>
      <tr>
        <th style="width:4%;">No</th>
        <th style="width:11%;">Tanggal</th>
        <th style="width:13%;">Bagian / Unit</th>
        <th style="width:30%;">Uraian Ketidaksesuaian</th>
        <th style="width:10%;">Jenis Ketidaksesuaian</th>
        <th style="width:10%;">Status (Open/Close)</th>
        <th style="width:12%;">Tgl Selesai</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      ${emptyRowHtml}
    </tbody>
  </table>

  <table style="margin-top:8px; width:auto;">
    <tr>
      <td style="padding:4px 10px; background:#f5f5f5; font-weight:bold;">Total Laporan</td>
      <td style="padding:4px 14px; text-align:center; font-weight:bold;">${data.length}</td>
      <td style="padding:4px 10px; background:#d1fae5; font-weight:bold;">Close</td>
      <td style="padding:4px 14px; text-align:center; font-weight:bold; color:#065f46;">
        ${data.filter((d) => d.status_laporan === "selesai").length}
      </td>
      <td style="padding:4px 10px; background:#fef3c7; font-weight:bold;">Open</td>
      <td style="padding:4px 14px; text-align:center; font-weight:bold; color:#92400e;">
        ${data.filter((d) => d.status_laporan !== "selesai").length}
      </td>
    </tr>
  </table>

  <div style="margin-top:20px; display:flex; justify-content:flex-end;">
    <div style="text-align:center; width:220px;">
      <p>Batam, ${tglCetak}</p>
      <p style="margin-top:4px; font-weight:bold;">Kepala P4M,</p>
      <div style="height:60px; margin:8px 0;"></div>
      <p style="font-weight:bold; border-top:1px solid #000; padding-top:4px; width:200px; margin:0 auto;">
        ______________________________
      </p>
    </div>
  </div>

  ${PRINT_SCRIPT}
</body>
</html>`;

  printWindow(html);
}