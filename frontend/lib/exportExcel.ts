// FILE: frontend/lib/exportExcel.ts
// Export Excel multi-worksheet menggunakan ExcelJS (browser-compatible)
// Worksheet 1: Ringkasan
// Worksheet 2: Laporan Masih Dipantau
// Worksheet 3: Laporan Selesai

import type { RekapItem, ProsesItem } from "./exportTypes";
import { fmtTgl, labelStatusReview, labelStatusBoxing } from "./exportHelpers";

// ─── Tipe kolom tabel ──────────────────────────────────────
interface KolomTabel {
  header: string;
  key: string;
  width: number;
}

const KOLOM: KolomTabel[] = [
  { header: "No",                    key: "no",          width: 5  },
  { header: "Kode Laporan",          key: "kode",        width: 14 },
  { header: "Jenis",                 key: "jenis",       width: 12 },
  { header: "Uraian Ketidaksesuaian",key: "uraian",      width: 40 },
  { header: "Unit",                  key: "unit",        width: 16 },
  { header: "Penyebab",              key: "penyebab",    width: 30 },
  { header: "Rencana Tindakan",      key: "rencana",     width: 30 },
  { header: "Hasil Tindak Lanjut",   key: "hasil",       width: 30 },
  { header: "Tgl Pelaksanaan",       key: "tglPelaks",   width: 16 },
  { header: "Status Review",         key: "statusReview",width: 20 },
  { header: "Status Boxing",         key: "statusBoxing",width: 18 },
  { header: "Tgl Masuk",             key: "tglMasuk",    width: 14 },
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

// ─── Fungsi utama export ────────────────────────────────────
export async function exportExcel(
  rekapData: RekapItem[],
  prosesData: ProsesItem[]
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

  wsRingkasan.mergeCells("A2:C2");
  const tglCell = wsRingkasan.getCell("A2");
  tglCell.value     = `Tanggal Export: ${tglExport}`;
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
    baris.forEach((b) => {
      const row = ws.addRow([
        b.no, b.kode, b.jenis, b.uraian, b.unit,
        b.penyebab, b.rencana, b.hasil,
        b.tglPelaks, b.statusReview, b.statusBoxing, b.tglMasuk,
      ]);
      row.height = 40;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      row.eachCell((cell: any) => styleData(cell, warnaBaris));

      // Kolom No rata tengah
      row.getCell(1).alignment = { horizontal: "center", vertical: "top" };
      // Kolom Kode rata tengah
      row.getCell(2).alignment = { horizontal: "center", vertical: "top" };
      // Kolom tanggal rata tengah
      row.getCell(9).alignment  = { horizontal: "center", vertical: "top" };
      row.getCell(10).alignment = { horizontal: "center", vertical: "top", wrapText: true };
      row.getCell(11).alignment = { horizontal: "center", vertical: "top" };
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