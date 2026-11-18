// FILE: frontend/lib/exportExcel.ts
// Export Excel multi-worksheet menggunakan ExcelJS (browser-compatible)
// Worksheet 1: Ringkasan
// Worksheet 2: Laporan Masih Dipantau
// Worksheet 3: Laporan Selesai
// Worksheet 4+: Arsip per tahun
//
// ✅ Setiap worksheet laporan mengikuti form resmi
//    "No.BO.34.3.1-V7 Borang Pengelolaan Ketidaksesuaian dan Tindakan
//    Perbaikan/Pencegahan" (logo + header borang, judul + TAHUN, tabel 11
//    kolom, blok tanda tangan Kepala P4M) dan SAMA dengan PDF rekap.

import type { RekapItem, ProsesItem, ArsipItem } from "./exportTypes";
import {
  fmtTgl,
  labelStatusReview,
  labelStatusBoxing,
  parseTglArsip,
  BORANG_REKAP_NOMOR,
  BORANG_REKAP_JUDUL,
  BORANG_REKAP_TANGGAL,
  JUDUL_LAPORAN_REKAP,
} from "./exportHelpers";

// ─── Kolom tabel (urutan & judul = form V7 = PDF rekap) ────
interface KolomTabel {
  header: string;
  key: "no" | "tglMasuk" | "jenis" | "uraian" | "unit" | "penyebab" | "rencana" | "hasil" | "tglPelaks" | "statusReview" | "statusBoxing";
  width: number;
  center?: boolean;
}

const KOLOM: KolomTabel[] = [
  { header: "No",                  key: "no",           width: 12, center: true },
  { header: "Tanggal\nPelaporan",  key: "tglMasuk",     width: 16, center: true },
  { header: "Jenis",               key: "jenis",        width: 14, center: true },
  { header: "Uraian",              key: "uraian",       width: 42 },
  { header: "Unit",                key: "unit",         width: 18, center: true },
  { header: "Penyebab",            key: "penyebab",     width: 32 },
  { header: "Rencana",             key: "rencana",      width: 32 },
  { header: "Hasil",               key: "hasil",        width: 32 },
  { header: "Tanggal\nSelesai",    key: "tglPelaks",    width: 16, center: true },
  { header: "Status\nReview",      key: "statusReview", width: 18, center: true },
  { header: "Status",              key: "statusBoxing", width: 14, center: true },
];

const JUMLAH_KOLOM = KOLOM.length;                              // 11
const KOLOM_AKHIR  = String.fromCharCode(64 + JUMLAH_KOLOM);    // "K"
const IDX_TTD      = KOLOM.findIndex((k) => k.key === "tglPelaks") + 1; // kolom ke-9 (I) — blok TTD

// Baris-baris template (sama dengan form)
const BARIS_HEADER_TABEL = 8;
const BARIS_DATA_AWAL    = BARIS_HEADER_TABEL + 1;

// ─── Baris data laporan ────────────────────────────────────
interface BarisLaporan {
  no:           number;
  jenis:        string;
  uraian:       string;
  unit:         string;
  penyebab:     string;
  rencana:      string;
  hasil:        string;
  tglPelaks:    string;
  statusReview: string;
  statusBoxing: string;
  tglMasuk:     string;
  lampiranAwal:  string | null; // foto dari pelapor → ditempel di bawah teks Uraian
  lampiranHasil: string | null; // foto hasil perbaikan → ditempel di bawah teks Hasil
  sortKey?:     number; // timestamp untuk pengurutan (BUKAN dari teks tanggal)
}

// ─── Helper logo ───────────────────────────────────────────
const LOGO_URL = "/logo-polibatam.png";

interface LogoSiap { buffer: ArrayBuffer; width: number; height: number }

// Logo aslinya 2303×2048 px (berat). Diperkecil lewat canvas supaya file Excel tetap ringan.
async function ambilLogo(): Promise<LogoSiap | null> {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const bmp = await createImageBitmap(await res.blob());
    const skala = Math.min(1, 320 / bmp.width);
    const width  = Math.round(bmp.width * skala);
    const height = Math.round(bmp.height * skala);
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
    bmp.close();
    const png: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
    if (!png) return null;
    return { buffer: await png.arrayBuffer(), width, height };
  } catch {
    return null;
  }
}

// ─── Helper foto laporan / foto hasil (ditempel di dalam sel Uraian & Hasil, sama seperti PDF) ───
const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

function getUploadUrl(file: string | null | undefined): string | null {
  if (!file) return null;
  if (file.startsWith("http://") || file.startsWith("https://")) return file;
  if (file.startsWith("uploads/")) return `${BASE_URL}/${file}`;
  return `${BASE_URL}/uploads/${file}`;
}

interface GambarSiap { buffer: ArrayBuffer; width: number; height: number }

// Download foto → diperkecil (maks 480px) & dijadikan JPEG lewat canvas supaya file Excel tetap ringan
// dan format apa pun (webp, dll) tetap bisa ditempel. Gagal → null (foto dilewati).
async function ambilGambar(url: string | null): Promise<GambarSiap | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bmp = await createImageBitmap(await res.blob());
    const skala  = Math.min(1, 480 / Math.max(bmp.width, bmp.height));
    const width  = Math.max(1, Math.round(bmp.width * skala));
    const height = Math.max(1, Math.round(bmp.height * skala));
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bmp, 0, 0, width, height);
    bmp.close();
    const jpg: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!jpg) return null;
    return { buffer: await jpg.arrayBuffer(), width, height };
  } catch {
    return null;
  }
}

function buatBaris(item: RekapItem | ProsesItem, no: number, isRekap: boolean): BarisLaporan {
  if (isRekap) {
    const d = item as RekapItem;
    return {
      no,
      jenis:        d.jenis_laporan          ?? "—",
      uraian:       d.uraian_ketidaksesuaian ?? "—",
      unit:         d.nama_unit              ?? "—",
      penyebab:     d.penyebab               ?? "—",
      rencana:      d.rencana_tindakan       ?? "—",
      hasil:        d.hasil_tindakan         ?? "—",
      tglPelaks:    fmtTgl(d.tanggal_pelaksanaan),
      // Sheet "Laporan Selesai" isinya SUDAH PASTI laporan yang tuntas
      // (id_boxing-nya ada di rekapData) — Status Review-nya selalu "Ditindaklanjuti".
      statusReview: "Ditindaklanjuti",
      statusBoxing: "Selesai",
      tglMasuk:     fmtTgl(d.created_at ?? null),
      lampiranAwal:  d.lampiran_laporan ?? null,
      lampiranHasil: d.lampiran_hasil ?? null,
      sortKey:      d.created_at ? new Date(d.created_at).getTime() : 0,
    };
  }
  const p = item as ProsesItem;
  return {
    no,
    jenis:        p.jenis_laporan    ?? "—",
    uraian:       p.isi_laporan      ?? "—",
    unit:         p.nama_unit        ?? "—",
    penyebab:     p.penyebab         ?? "—",
    rencana:      p.rencana_tindakan ?? "—",
    hasil:        p.hasil_tindakan   ?? "—",
    tglPelaks:    fmtTgl(p.tanggal_pelaksanaan),
    // Sheet "Laporan Masih Dipantau" = laporan yang BELUM tuntas → "Menunggu / Proses".
    // Progres detailnya tetap kelihatan di kolom "Status" lewat labelStatusBoxing().
    statusReview: "Menunggu / Proses",
    statusBoxing: labelStatusBoxing(p.status_boxing),
    tglMasuk:     fmtTgl(p.created_at ?? null),
    lampiranAwal:  p.lampiran_laporan ?? null,
    lampiranHasil: p.lampiran_hasil ?? null,
    sortKey:      p.created_at ? new Date(p.created_at).getTime() : 0,
  };
}

// Baris arsip (hasil upload Excel data tahun lalu) dipetakan ke bentuk BarisLaporan yang sama.
function buatBarisArsip(item: ArsipItem, no: number): BarisLaporan {
  return {
    no,
    jenis:        item.jenis_laporan ?? "—",
    uraian:       item.uraian_ketidaksesuaian ?? "—",
    unit:         item.unit ?? "—",
    penyebab:     item.penyebab ?? "—",
    rencana:      item.rencana_tindakan ?? "—",
    hasil:        item.hasil_tindakan ?? "—",
    tglPelaks:    item.tgl_pelaksanaan ?? "—",
    // nilai mentah enum → label; teks bebas dari Excel (mis. "Ditindaklanjuti") ditampilkan apa adanya
    statusReview: item.status_review
      ? (labelStatusReview(item.status_review) !== "—" ? labelStatusReview(item.status_review) : item.status_review)
      : "—",
    statusBoxing: item.status_boxing ?? "—",
    tglMasuk:     item.tgl_masuk ?? "—",
    lampiranAwal:  item.lampiran_laporan ?? null,
    lampiranHasil: item.lampiran_hasil ?? null,
    sortKey:      parseTglArsip(item.tgl_masuk)?.getTime() ?? 0,
  };
}

// Isi "TAHUN ...." pada judul form: pakai override kalau ada, kalau tidak
// ambil dari tahun tanggal pelaporan di data (1 tahun → "2026", beberapa → "2024 – 2026").
function labelTahun(baris: BarisLaporan[], tahunOverride?: number): string {
  if (tahunOverride) return String(tahunOverride);
  const tahun = new Set<number>();
  baris.forEach((b) => { if (b.sortKey) tahun.add(new Date(b.sortKey).getFullYear()); });
  const urut = [...tahun].sort((a, b) => a - b);
  if (urut.length === 0) return String(new Date().getFullYear());
  return urut.length === 1 ? String(urut[0]) : `${urut[0]} – ${urut[urut.length - 1]}`;
}

// Perkiraan tinggi baris (ExcelJS tidak auto-fit teks yang di-wrap).
function tinggiBaris(nilai: string[]): number {
  let maxBaris = 1;
  nilai.forEach((t, i) => {
    const perBaris = Math.max(1, Math.floor(KOLOM[i].width * 1.0));
    const jml = String(t ?? "")
      .split(/\r?\n/)
      .reduce((s, p) => s + Math.max(1, Math.ceil(p.length / perBaris)), 0);
    if (jml > maxBaris) maxBaris = jml;
  });
  return Math.min(409, Math.max(20, maxBaris * 13 + 6));
}

// ─── Fungsi utama export ────────────────────────────────────
// arsipData: opsional — data tahun-tahun lalu hasil "Upload Data Lama".
// Setiap tahun yang ada di data ini dibuatkan 1 worksheet sendiri (terbaru → terlama).
//
// tahunFilter: opsional — kalau diisi (mode filter dengan 1 tahun tertentu),
// semua data digabung jadi SATU worksheet dan "TAHUN ...." pada judul diisi tahun itu.
export async function exportExcel(
  rekapData: RekapItem[],
  prosesData: ProsesItem[],
  arsipData: ArsipItem[] = [],
  tahunFilter?: number,
  labelPeriode?: string // mis. "Juni 2026" — dipakai untuk nama sheet & file kalau ada filter
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ExcelJS = (await import("exceljs")) as any;
  const workbook = new ExcelJS.Workbook();

  workbook.creator  = "TUNTAS Polibatam";
  workbook.created  = new Date();
  workbook.modified = new Date();

  // ── Data persiapan ──────────────────────────────────────
  const selesaiBoxingIds = new Set(rekapData.map((d) => d.id_boxing));
  const dipantauData     = prosesData.filter((p) => !selesaiBoxingIds.has(p.id_boxing));

  const totalSemua            = rekapData.length + dipantauData.length;
  // Disamakan persis dengan isi sheet "Laporan Selesai" (=rekapData) dan
  // "Laporan Masih Dipantau" (=dipantauData).
  const jumlahDitindaklanjuti = rekapData.length;
  const jumlahMenunggu        = dipantauData.length;

  const tglExport = new Date().toLocaleDateString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
  });

  // ── Warna & style konstanta ─────────────────────────────
  const ABU_TUA   = "FF4D5E71";
  const ABU_MUDA  = "FFD0D7DE";
  const PUTIH     = "FFFFFFFF";
  const HITAM     = "FF000000";
  const KUNING_BG = "FFFEF9C3";

  function semuaBorder() {
    const garis = { style: "thin" as const, color: { argb: HITAM } };
    return { top: garis, left: garis, bottom: garis, right: garis };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function styleHeader(cell: any) {
    cell.font      = { bold: true, color: { argb: PUTIH }, name: "Arial", size: 10 };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: ABU_TUA } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border    = semuaBorder();
  }

  // Logo dimuat sekali, dipakai ulang di semua worksheet laporan
  const logo   = await ambilLogo();
  const logoId = logo ? workbook.addImage({ buffer: logo.buffer, extension: "png" }) : null;

  // ══════════════════════════════════════════════════════════
  // WORKSHEET 1 — RINGKASAN
  // ══════════════════════════════════════════════════════════
  const wsRingkasan = workbook.addWorksheet("Ringkasan");

  wsRingkasan.mergeCells("A1:C1");
  const judulCell = wsRingkasan.getCell("A1");
  judulCell.value     = "TUNTAS Polibatam — Ringkasan Rekapitulasi Ketidaksesuaian";
  judulCell.font      = { bold: true, size: 13, name: "Arial", color: { argb: ABU_TUA } };
  judulCell.alignment = { horizontal: "center" };

  const daftarTahunArsip = [...new Set(arsipData.map((a) => a.tahun))].sort((a, b) => b - a);

  wsRingkasan.mergeCells("A2:C2");
  const tglCell = wsRingkasan.getCell("A2");
  tglCell.value = daftarTahunArsip.length
    ? `Tanggal Export: ${tglExport}  |  Termasuk arsip tahun: ${daftarTahunArsip.join(", ")}`
    : `Tanggal Export: ${tglExport}`;
  tglCell.font      = { size: 10, name: "Arial", italic: true };
  tglCell.alignment = { horizontal: "center" };

  wsRingkasan.addRow([]);

  const pct = (n: number) => (totalSemua > 0 ? `${((n / totalSemua) * 100).toFixed(1)}%` : "—");
  const statistik: [string, number, string, string][] = [
    ["Ditindaklanjuti",     jumlahDitindaklanjuti, pct(jumlahDitindaklanjuti), "FFD1FAE5"],
    ["Menunggu / Proses",   jumlahMenunggu,        pct(jumlahMenunggu),        KUNING_BG ],
    ["Total Semua Laporan", totalSemua,            pct(totalSemua),            ABU_MUDA  ],
  ];

  const headerRing = wsRingkasan.addRow(["Status", "Jumlah", "Persentase"]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headerRing.eachCell((cell: any) => styleHeader(cell));
  wsRingkasan.getRow(headerRing.number).height = 22;

  statistik.forEach(([label, nilai, persen, warna]) => {
    const row = wsRingkasan.addRow([label, nilai, persen]);
    row.getCell(1).font      = { name: "Arial", size: 10, bold: true };
    row.getCell(1).alignment = { vertical: "middle", wrapText: true };
    row.getCell(1).border    = semuaBorder();
    row.getCell(1).fill      = { type: "pattern", pattern: "solid", fgColor: { argb: warna } };

    row.getCell(2).font      = { name: "Arial", size: 12, bold: true };
    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(2).border    = semuaBorder();
    row.getCell(2).fill      = { type: "pattern", pattern: "solid", fgColor: { argb: warna } };

    row.getCell(3).font      = { name: "Arial", size: 10 };
    row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(3).border    = semuaBorder();
    row.height = 22;
  });

  wsRingkasan.getColumn(1).width = 28;
  wsRingkasan.getColumn(2).width = 12;
  wsRingkasan.getColumn(3).width = 16;

  // ══════════════════════════════════════════════════════════
  // FUNGSI PEMBANTU — worksheet laporan (layout form BO.34.3.1-V7)
  // ══════════════════════════════════════════════════════════
  // Cache foto per URL (satu foto yang sama tidak diunduh berulang) — dipakai semua worksheet
  const cacheFoto = new Map<string, Promise<GambarSiap | null>>();
  const muatFoto = (file: string | null) => {
    const u = getUploadUrl(file);
    if (!u) return Promise.resolve(null);
    if (!cacheFoto.has(u)) cacheFoto.set(u, ambilGambar(u));
    return cacheFoto.get(u)!;
  };

  const IDX_URAIAN = KOLOM.findIndex((k) => k.key === "uraian");
  const IDX_HASIL  = KOLOM.findIndex((k) => k.key === "hasil");
  const FOTO_MAKS_TINGGI = 110; // px

  async function buatWorksheetLaporan(nama: string, baris: BarisLaporan[], tahunOverride?: number) {
    const ws = workbook.addWorksheet(nama);

    // Unduh semua foto laporan sheet ini sekaligus (paralel)
    const foto = await Promise.all(
      baris.map(async (b) => {
        const [awal, hasil] = await Promise.all([muatFoto(b.lampiranAwal), muatFoto(b.lampiranHasil)]);
        return { awal, hasil };
      })
    );

    // Lebar kolom
    KOLOM.forEach((k, i) => { ws.getColumn(i + 1).width = k.width; });

    // Pengaturan cetak: A4 landscape, muat 1 halaman lebar, header tabel diulang tiap halaman
    ws.pageSetup = {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      printTitlesRow: `${BARIS_HEADER_TABEL}:${BARIS_HEADER_TABEL}`,
    };
    ws.views = [{ showGridLines: false }];

    // ── Header borang (baris 1–2): logo + nomor/judul borang + tanggal borang ──
    ws.getRow(1).height = 26;
    ws.getRow(2).height = 26;

    const b1 = ws.getCell("B1");
    b1.value     = `${BORANG_REKAP_NOMOR} ${BORANG_REKAP_JUDUL}`;
    b1.font      = { bold: true, size: 12, name: "Arial" };
    b1.alignment = { horizontal: "left", vertical: "middle", indent: 1 };

    const b2 = ws.getCell("B2");
    b2.value     = BORANG_REKAP_TANGGAL;
    b2.font      = { bold: true, size: 12, name: "Arial" };
    b2.alignment = { horizontal: "left", vertical: "middle", indent: 1 };

    // Garis ganda di bawah header borang
    for (let c = 1; c <= JUMLAH_KOLOM; c++) {
      ws.getCell(2, c).border = { bottom: { style: "double", color: { argb: HITAM } } };
    }

    if (logo && logoId !== null) {
      const tinggiTampil = 58; // px, muat di 2 baris header (2 × 26pt ≈ 69px)
      const lebarTampil  = Math.round((tinggiTampil * logo.width) / logo.height);
      ws.addImage(logoId, {
        tl: { col: 0.12, row: 0.08 },
        ext: { width: lebarTampil, height: tinggiTampil },
        editAs: "oneCell",
      });
    }

    // ── Judul laporan (baris 5–6) ──
    ws.getRow(3).height = 8;

    ws.mergeCells(`A5:${KOLOM_AKHIR}5`);
    const judul = ws.getCell("A5");
    judul.value     = JUDUL_LAPORAN_REKAP;
    judul.font      = { bold: true, size: 11, name: "Arial" };
    judul.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(5).height = 20;

    ws.mergeCells(`A6:${KOLOM_AKHIR}6`);
    const tahun = ws.getCell("A6");
    tahun.value     = `TAHUN ${labelTahun(baris, tahunOverride)}`;
    tahun.font      = { bold: true, size: 11, name: "Arial" };
    tahun.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(6).height = 20;

    // ── Header tabel (baris 8) ──
    const headerRow = ws.getRow(BARIS_HEADER_TABEL);
    KOLOM.forEach((k, i) => { headerRow.getCell(i + 1).value = k.header; });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headerRow.eachCell({ includeEmpty: true }, (cell: any) => styleHeader(cell));
    headerRow.height = 30;

    // ── Baris data ──
    let barisTerakhir: number;

    if (baris.length > 0) {
      baris.forEach((b, idx) => {
        const r = BARIS_DATA_AWAL + idx;
        const row = ws.getRow(r);
        const nilai = KOLOM.map((k) => String(b[k.key] ?? ""));
        KOLOM.forEach((k, i) => {
          const cell = row.getCell(i + 1);
          cell.value     = k.key === "no" ? b.no : nilai[i];
          cell.font      = { name: "Arial", size: 10 };
          cell.border    = semuaBorder();
          cell.alignment = k.center
            ? { horizontal: "center", vertical: "middle", wrapText: true }
            : { horizontal: "left",   vertical: "top",    wrapText: true };
        });

        // Foto ditempel DI BAWAH teks sel (Uraian = foto laporan, Hasil = foto hasil), seperti PDF
        const ukur = (g: GambarSiap | null, kolomIdx: number) => {
          if (!g) return null;
          const maksLebar = Math.min(KOLOM[kolomIdx].width * 7 - 14, 200);
          const s = Math.min(maksLebar / g.width, FOTO_MAKS_TINGGI / g.height, 1);
          return { w: Math.round(g.width * s), h: Math.round(g.height * s) };
        };
        const uAwal  = ukur(foto[idx].awal,  IDX_URAIAN);
        const uHasil = ukur(foto[idx].hasil, IDX_HASIL);
        const tinggiTeks = tinggiBaris(nilai);
        const tinggiFotoPx = Math.max(uAwal?.h ?? 0, uHasil?.h ?? 0);
        const tinggiTotal = Math.min(409, tinggiTeks + (tinggiFotoPx ? tinggiFotoPx * 0.75 + 6 : 0));
        row.height = tinggiTotal;

        const tempel = (g: GambarSiap | null, ukuran: { w: number; h: number } | null, kolomIdx: number) => {
          if (!g || !ukuran) return;
          const id = workbook.addImage({ buffer: g.buffer, extension: "jpeg" });
          ws.addImage(id, {
            tl: { col: kolomIdx + 0.04, row: r - 1 + (tinggiTeks + 2) / tinggiTotal },
            ext: { width: ukuran.w, height: ukuran.h },
            editAs: "oneCell",
          });
        };
        tempel(foto[idx].awal,  uAwal,  IDX_URAIAN);
        tempel(foto[idx].hasil, uHasil, IDX_HASIL);
      });
      barisTerakhir = BARIS_DATA_AWAL + baris.length - 1;
    } else {
      // Tidak ada laporan → 1 baris keterangan saja (tidak ada nomor 1–8 / "dst...." bawaan template).
      // Baris tabel hanya muncul sebanyak laporan yang masuk.
      ws.mergeCells(BARIS_DATA_AWAL, 1, BARIS_DATA_AWAL, JUMLAH_KOLOM);
      for (let c = 1; c <= JUMLAH_KOLOM; c++) {
        ws.getCell(BARIS_DATA_AWAL, c).border = semuaBorder();
      }
      const kosong = ws.getCell(BARIS_DATA_AWAL, 1);
      kosong.value     = "Tidak ada data";
      kosong.font      = { name: "Arial", size: 10, italic: true, color: { argb: "FF6B7280" } };
      kosong.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(BARIS_DATA_AWAL).height = 22;
      barisTerakhir = BARIS_DATA_AWAL;
    }

    // ── Blok tanda tangan Kepala P4M (sesuai template: dikosongkan untuk diisi/ditandatangani) ──
    const barisTtd = barisTerakhir + 3;
    const letakTtd = (r: number, teks: string) => {
      ws.mergeCells(r, IDX_TTD, r, JUMLAH_KOLOM);
      const cell = ws.getCell(r, IDX_TTD);
      cell.value     = teks;
      cell.font      = { name: "Arial", size: 10 };
      cell.alignment = { horizontal: "left", vertical: "middle" };
    };
    letakTtd(barisTtd,     "Batam, ______________/20__");
    letakTtd(barisTtd + 2, "Kepala P4M,");
    letakTtd(barisTtd + 8, "____________________");

    return ws;
  }

  if (tahunFilter) {
    // ══════════════════════════════════════════════════════════
    // MODE KHUSUS 1 TAHUN — semua data (laporan berjalan + arsip tahun itu)
    // digabung jadi SATU worksheet.
    // ══════════════════════════════════════════════════════════
    const barisGabungan: BarisLaporan[] = [
      ...rekapData.map((d) => buatBaris(d, 0, true)),
      ...dipantauData.map((p) => buatBaris(p, 0, false)),
      ...arsipData.filter((a) => a.tahun === tahunFilter).map((a) => buatBarisArsip(a, 0)),
    ]
      // urut berdasarkan timestamp, bukan membandingkan teks "15 Juni 2026"
      .sort((a, b) => (b.sortKey ?? 0) - (a.sortKey ?? 0))
      .map((b, i) => ({ ...b, no: i + 1 }));

    const namaSheet = (labelPeriode ? `Laporan ${labelPeriode}` : `Laporan Tahun ${tahunFilter}`)
      .replace(/[\\/?*\[\]:]/g, "-").slice(0, 31);
    await buatWorksheetLaporan(namaSheet, barisGabungan, tahunFilter);
  } else {
    // WORKSHEET 2 — LAPORAN MASIH DIPANTAU
    const barisDipantau = dipantauData.map((p, i) => buatBaris(p, i + 1, false));
    await buatWorksheetLaporan("Laporan Masih Dipantau", barisDipantau);

    // WORKSHEET 3 — LAPORAN SELESAI
    const barisSelesai = rekapData.map((d, i) => buatBaris(d, i + 1, true));
    await buatWorksheetLaporan("Laporan Selesai", barisSelesai);

    // WORKSHEET ARSIP — 1 sheet per tahun hasil "Upload Data Lama", tahun terbaru dulu
    const tahunTersedia = [...new Set(arsipData.map((a) => a.tahun))].sort((a, b) => b - a);
    for (const tahun of tahunTersedia) {
      const barisTahunIni = arsipData
        .filter((a) => a.tahun === tahun)
        .map((a, i) => buatBarisArsip(a, i + 1));
      await buatWorksheetLaporan(`Arsip ${tahun}`, barisTahunIni, tahun);
    }
  }

  // ── Download ────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob   = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url    = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href     = url;
  anchor.download = tahunFilter
    ? `Rekapitulasi_TUNTAS_${(labelPeriode ?? `Tahun_${tahunFilter}`).replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`
    : `Rekapitulasi_TUNTAS_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}