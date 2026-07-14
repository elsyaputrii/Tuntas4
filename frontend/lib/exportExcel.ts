// FILE: frontend/lib/exportExcel.ts
// Export Excel multi-worksheet menggunakan ExcelJS (browser-compatible)
// Worksheet 1: Ringkasan
// Worksheet 2: Laporan Masih Dipantau
// Worksheet 3: Laporan Selesai

import type { RekapItem, ProsesItem, ArsipItem } from "./exportTypes";
import { fmtTgl, labelStatusReview, labelStatusBoxing } from "./exportHelpers";

// ─── Tipe kolom tabel ──────────────────────────────────────
interface KolomTabel {
  header: string;
  key: string;
  width: number;
}

// ✅ RAPI: lebar kolom dipangkas supaya sheet tidak lagi memanjang ke
// samping (sebelumnya total lebar ±245, sekarang ±178). Isi/urutan/nama
// kolom TIDAK berubah sama sekali — cuma lebarnya lebih pas dengan
// panjang teks yang biasanya muncul, dan teks panjang tetap aman karena
// tiap sel sudah wrapText + tinggi baris otomatis 40px.
const KOLOM: KolomTabel[] = [
  { header: "No",                    key: "no",          width: 5  },
  { header: "Kode Laporan",          key: "kode",        width: 12 },
  { header: "Jenis Laporan",         key: "jenis",       width: 11 },
  { header: "Tgl Masuk",             key: "tglMasuk",    width: 11 },
  { header: "Uraian Ketidaksesuaian",key: "uraian",      width: 28 },
  { header: "Unit",                  key: "unit",        width: 13 },
  { header: "Penyebab",              key: "penyebab",    width: 20 },
  { header: "Rencana Tindakan",      key: "rencana",     width: 20 },
  { header: "Hasil Tindak Lanjut",   key: "hasil",       width: 20 },
  { header: "Tgl Pelaksanaan",       key: "tglPelaks",   width: 12 },
  { header: "Status Review",         key: "statusReview",width: 15 },
  { header: "Status Proses",         key: "statusBoxing",width: 14 },
];

// ─── Baris data laporan ────────────────────────────────────
interface BarisLaporan {
  no:           number;
  kode:         string;
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
}

function buatBaris(item: RekapItem | ProsesItem, no: number, isRekap: boolean): BarisLaporan {
  if (isRekap) {
    const d = item as RekapItem;
    return {
      no,
      kode:         d.kode_laporan,
      jenis:        d.jenis_laporan        ?? "—",
      uraian:       d.uraian_ketidaksesuaian ?? "—",
      unit:         d.nama_unit            ?? "—",
      penyebab:     d.penyebab             ?? "—",
      rencana:      d.rencana_tindakan     ?? "—",
      hasil:        d.hasil_tindakan       ?? "—",
      tglPelaks:    fmtTgl(d.tanggal_pelaksanaan),
      statusReview: labelStatusReview(d.status_review),
      statusBoxing: "Selesai",
      tglMasuk:     fmtTgl(d.created_at ?? null),
    };
  } else {
    const p = item as ProsesItem;
    return {
      no,
      kode:         p.kode_laporan,
      jenis:        p.jenis_laporan    ?? "—",
      uraian:       p.isi_laporan      ?? "—",
      unit:         p.nama_unit        ?? "—",
      penyebab:     p.penyebab         ?? "—",
      rencana:      p.rencana_tindakan ?? "—",
      hasil:        p.hasil_tindakan   ?? "—",
      tglPelaks:    fmtTgl(p.tanggal_pelaksanaan),
      statusReview: labelStatusReview(p.status_review),
      statusBoxing: labelStatusBoxing(p.status_boxing),
      tglMasuk:     fmtTgl(p.created_at ?? null),
    };
  }
}

// ✅ BARU: baris arsip (hasil upload Excel data tahun lalu) dipetakan ke
// bentuk BarisLaporan yang sama supaya bisa dirender pakai fungsi
// buatWorksheetLaporan yang sudah ada, tanpa mengubah tampilan tabel.
function buatBarisArsip(item: ArsipItem, no: number): BarisLaporan {
  return {
    no,
    kode:         item.kode_laporan ?? "—",
    jenis:        item.jenis_laporan ?? "—",
    uraian:       item.uraian_ketidaksesuaian ?? "—",
    unit:         item.unit ?? "—",
    penyebab:     item.penyebab ?? "—",
    rencana:      item.rencana_tindakan ?? "—",
    hasil:        item.hasil_tindakan ?? "—",
    tglPelaks:    item.tgl_pelaksanaan ?? "—",
    statusReview: item.status_review ? labelStatusReview(item.status_review) : (item.status_review ?? "—"),
    statusBoxing: item.status_boxing ?? "—",
    tglMasuk:     item.tgl_masuk ?? "—",
  };
}

// ─── Fungsi utama export ────────────────────────────────────
// arsipData: opsional — data tahun-tahun lalu hasil "Upload Data Lama"
// (lihat tombol Upload di sebelah tombol Excel pada RecapitulationTable).
// Setiap tahun yang ada di data ini akan dibuatkan 1 worksheet sendiri,
// diurutkan dari tahun terbaru ke terlama, supaya rapi dan mudah dicari.
export async function exportExcel(
  rekapData: RekapItem[],
  prosesData: ProsesItem[],
  arsipData: ArsipItem[] = []
): Promise<void> {
  // Import ExcelJS secara dinamis (browser bundle via CDN atau npm)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ExcelJS = (await import("exceljs")) as any;
  const workbook = new ExcelJS.Workbook();

  workbook.creator  = "TUNTAS Polibatam";
  workbook.created  = new Date();
  workbook.modified = new Date();

  // ── Data persiapan ──────────────────────────────────────
  const selesaiBoxingIds    = new Set(rekapData.map((d) => d.id_boxing));
  const dipantauData        = prosesData.filter((p) => !selesaiBoxingIds.has(p.id_boxing));

  const totalSemua          = rekapData.length + dipantauData.length;
  const jumlahSelesai       = rekapData.length;
  const jumlahDipantau      = dipantauData.length;
  const jumlahDitindaklanjuti =
    rekapData.filter((d) => d.status_review === "ditindaklanjuti").length +
    dipantauData.filter((p) => p.status_review === "ditindaklanjuti").length;
  const jumlahTidakDitindak =
    rekapData.filter((d) => d.status_review === "tidak_ditindaklanjuti").length +
    dipantauData.filter((p) => p.status_review === "tidak_ditindaklanjuti").length;

  const tglExport = new Date().toLocaleDateString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
  });

  // ── Warna & style konstanta ─────────────────────────────
  const ABU_TUA   = "FF4D5E71";
  const ABU_MUDA  = "FFD0D7DE";
  const PUTIH     = "FFFFFFFF";
  const HIJAU_BG  = "FFD1FAE5";
  const KUNING_BG = "FFFEF9C3";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function styleHeader(cell: any) {
    cell.font      = { bold: true, color: { argb: PUTIH }, name: "Arial", size: 10 };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: ABU_TUA } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border    = semuaBorder();
  }

  function semuaBorder() {
    const garis = { style: "thin" as const };
    return { top: garis, left: garis, bottom: garis, right: garis };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function styleData(cell: any, warna?: string) {
    cell.font      = { name: "Arial", size: 9 };
    cell.alignment = { vertical: "top", wrapText: true };
    cell.border    = semuaBorder();
    if (warna) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: warna } };
    }
  }

  // ✅ BARU: supaya tabel tidak polos 1 warna rata dari atas ke bawah,
  // baris genap dibuat lebih pudar (dicampur putih) dari warna dasarnya —
  // jadi kelihatan selang-seling (zebra stripe) tapi tetap 1 tema warna
  // per tab (kuning=dipantau, hijau=selesai, ungu=arsip).
  function cerahkanWarna(argbWarna: string, faktor: number): string {
    const hex = argbWarna.slice(2); // buang 2 karakter alpha "FF" di depan
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const campur = (c: number) => Math.round(c + (255 - c) * faktor);
    const keHex = (c: number) => c.toString(16).padStart(2, "0").toUpperCase();
    return `FF${keHex(campur(r))}${keHex(campur(g))}${keHex(campur(b))}`;
  }

  // ══════════════════════════════════════════════════════════
  // WORKSHEET 1 — RINGKASAN
  // ══════════════════════════════════════════════════════════
  const wsRingkasan = workbook.addWorksheet("Ringkasan");

  // Judul utama
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

  // Baris statistik ringkasan
  const statistik = [
    ["Laporan Selesai",        jumlahSelesai,            HIJAU_BG ],
    ["Laporan Masih Dipantau", jumlahDipantau,           KUNING_BG],
    ["Ditindaklanjuti",        jumlahDitindaklanjuti,    "FFD0E4FF"],
    ["Tidak Ditindaklanjuti",  jumlahTidakDitindak,      "FFFEE2E2"],
    ["Total Semua Laporan",    totalSemua,               ABU_MUDA ],
  ];

  // Header tabel ringkasan
  const headerRing = wsRingkasan.addRow(["Status", "Jumlah", "Keterangan"]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headerRing.eachCell((cell: any) => styleHeader(cell));
  wsRingkasan.getRow(headerRing.number).height = 22;

  statistik.forEach(([label, nilai, warna]) => {
    const row = wsRingkasan.addRow([label, nilai, ""]);
    row.getCell(1).font      = { name: "Arial", size: 10, bold: true };
    row.getCell(1).alignment = { vertical: "middle", wrapText: true };
    row.getCell(1).border    = semuaBorder();
    row.getCell(1).fill      = { type: "pattern", pattern: "solid", fgColor: { argb: warna as string } };

    row.getCell(2).font      = { name: "Arial", size: 12, bold: true };
    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(2).border    = semuaBorder();
    row.getCell(2).fill      = { type: "pattern", pattern: "solid", fgColor: { argb: warna as string } };

    row.getCell(3).border    = semuaBorder();
    row.height = 22;
  });

  wsRingkasan.getColumn(1).width = 28;
  wsRingkasan.getColumn(2).width = 12;
  wsRingkasan.getColumn(3).width = 30;

  // ══════════════════════════════════════════════════════════
  // FUNGSI PEMBANTU — buat worksheet tabel laporan
  // ══════════════════════════════════════════════════════════
  function buatWorksheetLaporan(
    nama: string,
    baris: BarisLaporan[],
    warnaBaris?: string
  ) {
    const ws = workbook.addWorksheet(nama);

    // Judul sheet
    ws.mergeCells(`A1:L1`);
    const jCell = ws.getCell("A1");
    jCell.value     = `TUNTAS Polibatam — ${nama}`;
    jCell.font      = { bold: true, size: 12, name: "Arial", color: { argb: ABU_TUA } };
    jCell.alignment = { horizontal: "center" };

    ws.mergeCells("A2:L2");
    const tCell = ws.getCell("A2");
    tCell.value     = `Tanggal Export: ${tglExport}  |  Total: ${baris.length} laporan`;
    tCell.font      = { size: 9, italic: true, name: "Arial" };
    tCell.alignment = { horizontal: "center" };

    ws.addRow([]);

    // Header tabel
    const headerRow = ws.addRow(KOLOM.map((k) => k.header));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headerRow.eachCell((cell: any) => styleHeader(cell));
    headerRow.height = 28;

    // Freeze header
    ws.views = [{ state: "frozen", xSplit: 0, ySplit: 4, topLeftCell: "A5" }];

    // Lebar kolom
    KOLOM.forEach((k, i) => {
      ws.getColumn(i + 1).width = k.width;
    });

    // Baris data
    baris.forEach((b, idx) => {
      const row = ws.addRow([
        b.no, b.kode, b.jenis, b.tglMasuk, b.uraian, b.unit,
        b.penyebab, b.rencana, b.hasil,
        b.tglPelaks, b.statusReview, b.statusBoxing,
      ]);
      row.height = 40;
      // Baris genap (idx 1, 3, 5, ...) dibuat lebih pudar supaya selang-seling,
      // baris ganjil (idx 0, 2, 4, ...) tetap pakai warna dasar tab ini.
      const warnaBarisIni =
        warnaBaris && idx % 2 === 1 ? cerahkanWarna(warnaBaris, 0.55) : warnaBaris;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      row.eachCell((cell: any) => styleData(cell, warnaBarisIni));

      // Kolom No rata tengah
      row.getCell(1).alignment = { horizontal: "center", vertical: "top" };
      // Kolom Kode rata tengah
      row.getCell(2).alignment = { horizontal: "center", vertical: "top" };
      // Kolom Tgl Masuk rata tengah
      row.getCell(4).alignment  = { horizontal: "center", vertical: "top" };
      // Kolom tanggal pelaksanaan rata tengah
      row.getCell(10).alignment = { horizontal: "center", vertical: "top" };
      row.getCell(11).alignment = { horizontal: "center", vertical: "top", wrapText: true };
      row.getCell(12).alignment = { horizontal: "center", vertical: "top" };
    });

    // Baris kosong jika tidak ada data
    if (baris.length === 0) {
      const emptyRow = ws.addRow(["Tidak ada data", "", "", "", "", "", "", "", "", "", "", ""]);
      ws.mergeCells(`A${emptyRow.number}:L${emptyRow.number}`);
      emptyRow.getCell(1).alignment = { horizontal: "center" };
      emptyRow.getCell(1).font      = { italic: true, color: { argb: "FF9CA3AF" }, name: "Arial" };
      emptyRow.getCell(1).border    = semuaBorder();
    }

    return ws;
  }

  // ══════════════════════════════════════════════════════════
  // WORKSHEET 2 — LAPORAN MASIH DIPANTAU
  // ══════════════════════════════════════════════════════════
  const barisDipantau = dipantauData.map((p, i) =>
    buatBaris(p, i + 1, false)
  );
  buatWorksheetLaporan("Laporan Masih Dipantau", barisDipantau, KUNING_BG);

  // ══════════════════════════════════════════════════════════
  // WORKSHEET 3 — LAPORAN SELESAI
  // ══════════════════════════════════════════════════════════
  const barisSelesai = rekapData.map((d, i) =>
    buatBaris(d, i + 1, true)
  );
  buatWorksheetLaporan("Laporan Selesai", barisSelesai, HIJAU_BG);

  // ══════════════════════════════════════════════════════════
  // WORKSHEET ARSIP — 1 sheet per tahun hasil "Upload Data Lama"
  // (data 1–10 tahun ke belakang), diurutkan tahun terbaru dulu
  // supaya tersusun rapi dan gampang dicari.
  // ══════════════════════════════════════════════════════════
  const UNGU_BG = "FFE9D5FF";
  const tahunTersedia = [...new Set(arsipData.map((a) => a.tahun))].sort((a, b) => b - a);

  tahunTersedia.forEach((tahun) => {
    const barisTahunIni = arsipData
      .filter((a) => a.tahun === tahun)
      .map((a, i) => buatBarisArsip(a, i + 1));
    buatWorksheetLaporan(`Arsip ${tahun}`, barisTahunIni, UNGU_BG);
  });

  // ── Download ────────────────────────────────────────────
  const buffer   = await workbook.xlsx.writeBuffer();
  const blob     = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url      = URL.createObjectURL(blob);
  const anchor   = document.createElement("a");
  anchor.href     = url;
  anchor.download = `Rekapitulasi_TUNTAS_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}