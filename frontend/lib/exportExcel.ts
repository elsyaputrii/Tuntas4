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

// ✅ RAPI v2: lebar kolom dilebarin lagi khusus untuk kolom-kolom yang
// sebelumnya kepotong/wrap jadi 2 baris di header (mis. "Tgl Pelaksanaan",
// "Status Review", "Status Proses") sehingga kelihatan sempit & berantakan.
// Kolom teks panjang (Uraian/Penyebab/Rencana/Hasil) tetap dijaga secukupnya
// supaya sheet tidak balik memanjang berlebihan ke samping.
const KOLOM: KolomTabel[] = [
  { header: "No",                    key: "no",          width: 5  },
  { header: "Kode Laporan",          key: "kode",        width: 13 },
  { header: "Jenis Laporan",         key: "jenis",       width: 13 },
  { header: "Tgl Masuk",             key: "tglMasuk",    width: 13 },
  { header: "Uraian Ketidaksesuaian",key: "uraian",      width: 28 },
  { header: "Unit",                  key: "unit",        width: 14 },
  { header: "Penyebab",              key: "penyebab",    width: 20 },
  { header: "Rencana Tindakan",      key: "rencana",     width: 20 },
  { header: "Hasil Tindak Lanjut",   key: "hasil",       width: 22 },
  { header: "Tgl Pelaksanaan",       key: "tglPelaks",   width: 17 },
  { header: "Status Review",         key: "statusReview",width: 18 },
  { header: "Status Proses",         key: "statusBoxing",width: 17 },
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
      // ✅ Sheet "Laporan Selesai" isinya SUDAH PASTI laporan yang tuntas
      // (id_boxing-nya ada di rekapData) — jadi Status Review-nya selalu
      // "Ditindaklanjuti", nggak perlu lihat raw status_review lagi
      // (yang sebelumnya malah bikin bingung karena satu sheet bisa
      // kelihatan campur "Ditindaklanjuti"/"Tidak Ditindaklanjuti").
      statusReview: "Ditindaklanjuti",
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
      // ✅ Sheet "Laporan Masih Dipantau" isinya laporan yang BELUM
      // tuntas (masih ada tahap lanjutan, apa pun keputusan review-nya
      // sejauh ini) — jadi Status Review-nya selalu "Menunggu / Proses".
      // Progres detailnya (lagi di tahap mana persisnya: di unit, di
      // Staf, dst) tetap kelihatan lengkap di kolom "Status Proses"
      // sebelah kanannya lewat labelStatusBoxing().
      statusReview: "Menunggu / Proses",
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
//
// tahunFilter: opsional — kalau diisi (mode filter "Tahunan" lagi aktif
// dan user milih 1 tahun tertentu, misal 2024), maka rekapData/prosesData/
// arsipData yang masuk ke sini DIANGGAP SUDAH di-filter tahun itu oleh
// pemanggil, dan hasil export-nya akan digabung jadi SATU worksheet
// "Laporan Tahun {tahun}" (bukan dipecah Selesai/Dipantau/Arsip terpisah),
// serta nama file-nya otomatis dikasih tahun tsb supaya jelas ini
// memang file khusus tahun itu.
export async function exportExcel(
  rekapData: RekapItem[],
  prosesData: ProsesItem[],
  arsipData: ArsipItem[] = [],
  tahunFilter?: number
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
  // ✅ Disamakan persis dengan isi sheet "Laporan Selesai" (=rekapData)
  // dan "Laporan Masih Dipantau" (=dipantauData): "Ditindaklanjuti" =
  // jumlah baris di sheet Selesai, "Menunggu / Proses" = jumlah baris di
  // sheet Masih Dipantau. TIDAK lagi lihat raw status_review per-item,
  // supaya angka Ringkasan selalu pas kalau dijumlah sama baris di dua
  // sheet lainnya (sebelumnya bisa beda kalau ada laporan yang review-nya
  // sudah "Sesuai" tapi boxing-nya belum ditutup Ka P4M di tab Hasil
  // Tindak Lanjut — laporan itu tetap dihitung "Ditindaklanjuti" padahal
  // masih nangkring di sheet Masih Dipantau).
  const jumlahDitindaklanjuti = rekapData.length;
  const jumlahMenunggu        = dipantauData.length;

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

  // Baris statistik ringkasan — sekarang PERSIS sama kategorinya dengan
  // tabel "Rekap Status Tindak Lanjut" di halaman web (Ditindaklanjuti /
  // Menunggu-Proses / Total), termasuk kolom persentase-nya, supaya angka
  // di Excel nggak lagi kelihatan beda sendiri dari yang ditampilkan di
  // layar.
  const pct = (n: number) => (totalSemua > 0 ? `${((n / totalSemua) * 100).toFixed(1)}%` : "—");
  const statistik: [string, number, string, string][] = [
    ["Ditindaklanjuti",       jumlahDitindaklanjuti, pct(jumlahDitindaklanjuti), "FFD1FAE5"],
    ["Menunggu / Proses",     jumlahMenunggu,        pct(jumlahMenunggu),        KUNING_BG ],
    ["Total Semua Laporan",   totalSemua,            pct(totalSemua),           ABU_MUDA  ],
  ];

  // Header tabel ringkasan
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

    // ⚠️ Sengaja TIDAK pakai "freeze panes" (baris judul dibekukan pas
    // scroll). Sebelumnya pakai ws.views = [{state:"frozen", ...}], tapi
    // ternyata perilakunya nggak konsisten antar versi Excel — di
    // sebagian Excel Desktop malah bikin baris judul & header kerender
    // DOBEL secara visual pas file dibuka/discroll (bukan data asli yang
    // dobel, cuma glitch tampilan, tapi tetap bikin bingung). Ganti
    // topLeftCell juga sudah dicoba dan nggak konsisten (fix untuk satu
    // versi Excel malah bikin versi lain dobel). Daripada gambling per
    // versi Excel yang dipakai user, freeze-nya dihapus total — lebih
    // aman & konsisten di semua versi, cuma judul & header jadi ikut
    // scroll biasa (nggak nempel di atas lagi).

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

  if (tahunFilter) {
    // ══════════════════════════════════════════════════════════
    // MODE KHUSUS 1 TAHUN — semua data (laporan berjalan tahun ini +
    // arsip tahun itu kalau ada) digabung jadi SATU worksheet, biar
    // filenya bener-bener representasi "laporan tahun {tahunFilter}".
    // ══════════════════════════════════════════════════════════
    const barisGabungan: BarisLaporan[] = [
      ...rekapData.map((d) => buatBaris(d, 0, true)),
      ...dipantauData.map((p) => buatBaris(p, 0, false)),
      ...arsipData.filter((a) => a.tahun === tahunFilter).map((a) => buatBarisArsip(a, 0)),
    ]
      // urutkan dari tanggal masuk terbaru ke terlama biar enak dibaca
      .sort((a, b) => (a.tglMasuk < b.tglMasuk ? 1 : -1))
      .map((b, i) => ({ ...b, no: i + 1 }));

    const warnaTahun = "FFD1FAE5"; // hijau muda, senada tema "Selesai"
    buatWorksheetLaporan(`Laporan Tahun ${tahunFilter}`, barisGabungan, warnaTahun);
  } else {
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
  }

  // ── Download ────────────────────────────────────────────
  const buffer   = await workbook.xlsx.writeBuffer();
  const blob     = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url      = URL.createObjectURL(blob);
  const anchor   = document.createElement("a");
  anchor.href     = url;
  anchor.download = tahunFilter
    ? `Rekapitulasi_TUNTAS_Tahun_${tahunFilter}_${new Date().toISOString().slice(0, 10)}.xlsx`
    : `Rekapitulasi_TUNTAS_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}