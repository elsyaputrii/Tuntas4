"use client";
import { useState, useEffect, useCallback } from "react";
import { stafApi } from "@/lib/api";

interface RekapItem {
  id_laporan: number;
  id_boxing: number;
  kode_laporan: string;
  jenis_laporan: string;
  uraian_ketidaksesuaian: string;
  lampiran_laporan: string | null;
  status_laporan: string;
  nama_unit: string | null;
  status_review: string | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  hasil_tindakan: string | null;
  lampiran_hasil: string | null;
  tanggal_pelaksanaan: string | null;
}

function fmtTgl(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function exportExcel(data: RekapItem[]) {
  const totalMasuk = data.length;
  const ditindaklanjuti = data.filter(
    (d) => d.status_review === "ditindaklanjuti"
  ).length;
  const tidakDitindaklanjuti = data.filter(
    (d) => d.status_review === "tidak_ditindaklanjuti"
  ).length;

  const rows: string[][] = [
    ["REKAPITULASI LAPORAN KETIDAKSESUAIAN - TUNTAS POLIBATAM"],
    ["Tanggal Export", new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })],
    [],
    ["RINGKASAN"],
    ["Total Laporan Masuk (Selesai)", String(totalMasuk)],
    ["Ditindaklanjuti", String(ditindaklanjuti)],
    ["Tidak Ditindaklanjuti", String(tidakDitindaklanjuti)],
    [],
    [
      "No",
      "Kode Laporan",
      "Jenis Laporan",
      "Uraian Ketidaksesuaian",
      "Unit",
      "Penyebab",
      "Rencana Tindakan",
      "Hasil Tindak Lanjut",
      "Tanggal Pelaksanaan",
      "Status Keputusan",
    ],
  ];

  data.forEach((item, idx) => {
    const keputusan =
      item.status_review === "ditindaklanjuti"
        ? "Ditindaklanjuti"
        : item.status_review === "tidak_ditindaklanjuti"
        ? "Tidak Ditindaklanjuti"
        : "-";

    rows.push([
      String(idx + 1),
      item.kode_laporan,
      item.jenis_laporan ?? "-",
      item.uraian_ketidaksesuaian ?? "-",
      item.nama_unit ?? "-",
      item.penyebab ?? "-",
      item.rencana_tindakan ?? "-",
      item.hasil_tindakan ?? "-",
      fmtTgl(item.tanggal_pelaksanaan),
      keputusan,
    ]);
  });

  const csvContent =
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Rekapitulasi_TUNTAS_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportPDF(data: RekapItem[]) {
  const totalMasuk = data.length;
  const ditindaklanjuti = data.filter(
    (d) => d.status_review === "ditindaklanjuti"
  ).length;
  const tidakDitindaklanjuti = data.filter(
    (d) => d.status_review === "tidak_ditindaklanjuti"
  ).length;

  const rows = data
    .map(
      (item, idx) => `
      <tr>
        <td style="text-align:center">${idx + 1}</td>
        <td style="text-align:center;font-weight:600">${item.kode_laporan}</td>
        <td style="text-transform:capitalize">${item.jenis_laporan ?? "-"}</td>
        <td>${item.uraian_ketidaksesuaian ?? "-"}</td>
        <td style="text-align:center">${item.nama_unit ?? "-"}</td>
        <td>${item.penyebab ?? "-"}</td>
        <td>${item.rencana_tindakan ?? "-"}</td>
        <td>${item.hasil_tindakan ?? "-"}</td>
        <td style="text-align:center">${fmtTgl(item.tanggal_pelaksanaan)}</td>
        <td style="text-align:center">
          <span style="
            display:inline-block;
            padding:2px 8px;
            border-radius:4px;
            font-size:10px;
            font-weight:700;
            background:${item.status_review === "ditindaklanjuti" ? "#d1fae5" : item.status_review === "tidak_ditindaklanjuti" ? "#fee2e2" : "#f3f4f6"};
            color:${item.status_review === "ditindaklanjuti" ? "#065f46" : item.status_review === "tidak_ditindaklanjuti" ? "#991b1b" : "#6b7280"};
          ">
            ${item.status_review === "ditindaklanjuti" ? "Ditindaklanjuti" : item.status_review === "tidak_ditindaklanjuti" ? "Tidak Ditindaklanjuti" : "-"}
          </span>
        </td>
      </tr>`
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Laporan Rekapitulasi TUNTAS Polibatam</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 3px double #4d5e71; padding-bottom: 14px; }
        .header .logo-row { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 8px; }
        .header .logo-box { width: 48px; height: 48px; background: #4d5e71; color: white; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900; border-radius: 6px; }
        .header h1 { font-size: 16px; font-weight: 900; color: #4d5e71; letter-spacing: 0.5px; }
        .header h2 { font-size: 13px; font-weight: 700; color: #222; margin-top: 2px; }
        .header p  { font-size: 10px; color: #666; margin-top: 4px; }
        .summary { display: flex; gap: 16px; margin-bottom: 18px; }
        .summary-card { flex: 1; border: 1.5px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; }
        .summary-card .label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .summary-card .value { font-size: 22px; font-weight: 900; margin-top: 2px; }
        .summary-card.total  { border-color: #4d5e71; }  .summary-card.total  .value { color: #4d5e71; }
        .summary-card.ditindak { border-color: #10b981; } .summary-card.ditindak .value { color: #059669; }
        .summary-card.tidak   { border-color: #ef4444; }  .summary-card.tidak   .value { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        thead tr { background: #4d5e71; color: white; }
        thead th { padding: 7px 6px; text-align: center; font-weight: 700; border: 1px solid #3a4d5e; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        tbody tr:hover { background: #eff6ff; }
        tbody td { padding: 6px; border: 1px solid #e2e8f0; vertical-align: top; line-height: 1.4; }
        .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        .ttd { text-align: center; }
        .ttd .name { margin-top: 50px; font-weight: 700; border-top: 1px solid #333; padding-top: 4px; width: 180px; margin-left: auto; margin-right: auto; }
        @media print {
          body { padding: 10px; }
          @page { size: A4 landscape; margin: 15mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-row">
          <div class="logo-box">T</div>
          <div>
            <h1>TUNTAS — Politeknik Negeri Batam</h1>
            <h2>Laporan Rekapitulasi Ketidaksesuaian</h2>
            <p>Dicetak: ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
        </div>
      </div>
      <div class="summary">
        <div class="summary-card total">
          <div class="label">Total Laporan Selesai</div>
          <div class="value">${totalMasuk}</div>
        </div>
        <div class="summary-card ditindak">
          <div class="label">Ditindaklanjuti</div>
          <div class="value">${ditindaklanjuti}</div>
        </div>
        <div class="summary-card tidak">
          <div class="label">Tidak Ditindaklanjuti</div>
          <div class="value">${tidakDitindaklanjuti}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:28px">No</th>
            <th style="width:72px">Kode</th>
            <th style="width:64px">Jenis</th>
            <th>Uraian Ketidaksesuaian</th>
            <th style="width:80px">Unit</th>
            <th>Penyebab</th>
            <th>Rencana Tindakan</th>
            <th>Hasil Tindak Lanjut</th>
            <th style="width:80px">Tgl Pelaksanaan</th>
            <th style="width:90px">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="10" style="text-align:center;padding:20px;color:#9ca3af;font-style:italic">Belum ada data rekapitulasi</td></tr>`}
        </tbody>
      </table>
      <div class="footer">
        <div>
          <p>Dokumen ini digenerate otomatis oleh sistem TUNTAS Polibatam.</p>
          <p>Jika ada ketidaksesuaian data, hubungi P4M Polibatam.</p>
        </div>
        <div class="ttd">
          <p>Batam, ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</p>
          <p>Kepala P4M,</p>
          <div class="name">( _________________ )</div>
        </div>
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  const win = window.open("", "_blank", "width=1000,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export default function RecapitulationTable() {
  const [data, setData] = useState<RekapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await stafApi.getRekapitulasi();
      setData(res.data);
    } catch {
      setError("Gagal memuat data rekapitulasi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function ditindaklanjutiLagi(id_boxing: number) {
    const ok = confirm(
      "Laporan akan ditindaklanjuti lagi dan dikirim kembali ke Kepala Unit untuk mengisi ulang hasil tindak lanjut. Lanjutkan?"
    );
    if (!ok) return;
    try {
      const res = await stafApi.setKeputusanBoxing(id_boxing, "ditindak_lanjut");
      setMsg(res.message);
      setTimeout(() => setMsg(""), 5000);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status.");
      setTimeout(() => setError(""), 4000);
    }
  }

  function handleExportExcel() {
    setExportingExcel(true);
    try {
      exportExcel(data);
    } finally {
      setTimeout(() => setExportingExcel(false), 1000);
    }
  }

  function handleExportPDF() {
    setExportingPDF(true);
    try {
      exportPDF(data);
    } finally {
      setTimeout(() => setExportingPDF(false), 1000);
    }
  }

  if (loading) {
    return (
      <div className="w-full border-2 border-black bg-white p-10 text-center text-sm text-gray-400 italic">
        Memuat data...
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="w-full border-2 border-black bg-white p-10 text-center text-sm text-red-500">
        ❌ {error}
      </div>
    );
  }

  const totalMasuk = data.length;
  const ditindaklanjuti = data.filter((d) => d.status_review === "ditindaklanjuti").length;
  const tidakDitindaklanjuti = data.filter((d) => d.status_review === "tidak_ditindaklanjuti").length;

  return (
    <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
      <p className="text-[10px] text-gray-600 px-3 py-2 bg-amber-50 border-b border-amber-200">
        Laporan di sini sudah ditandai selesai. Anda tetap bisa menekan{" "}
        <strong>Ditindaklanjuti lagi</strong> agar kembali ke Kepala Unit (tab Laporan Hasil).
      </p>

      {msg && (
        <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b">{msg}</p>
      )}
      {error && (
        <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b">❌ {error}</p>
      )}

      {/* Statistik ringkasan */}
      <div className="flex gap-4 p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded shadow-sm">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">Total Selesai</span>
          <span className="text-base font-black text-[#4d5e71]">{totalMasuk}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded shadow-sm">
          <span className="text-[10px] text-green-700 uppercase tracking-wide">Ditindaklanjuti</span>
          <span className="text-base font-black text-green-700">{ditindaklanjuti}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded shadow-sm">
          <span className="text-[10px] text-red-600 uppercase tracking-wide">Tidak Ditindaklanjuti</span>
          <span className="text-base font-black text-red-600">{tidakDitindaklanjuti}</span>
        </div>
      </div>

      {/* Tombol Export */}
      <div className="flex gap-2 items-center p-3 border-b border-gray-200 bg-white">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-bold mr-1">
          📥 EXPORT :
        </span>

        <button
          type="button"
          onClick={handleExportPDF}
          disabled={exportingPDF || data.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[10px] font-bold rounded transition-all shadow-sm"
        >
          {exportingPDF ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Membuka...
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="12" x2="15" y2="12" />
                <line x1="9" y1="16" x2="12" y2="16" />
              </svg>
              PDF
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleExportExcel}
          disabled={exportingExcel || data.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-800 disabled:bg-green-300 text-white text-[10px] font-bold rounded transition-all shadow-sm"
        >
          {exportingExcel ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Mengunduh...
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18M3 9h18M3 15h18" />
              </svg>
              Excel
            </>
          )}
        </button>

        {data.length === 0 && (
          <span className="text-[9px] text-gray-400 italic ml-1">
            (Belum ada data untuk diekspor)
          </span>
        )}
      </div>

      {/* Header tabel */}
      <div className="flex min-w-[1100px] font-bold uppercase border-t border-black bg-gray-50 text-center">
        <div className="w-12 border-r-2 border-black p-3">NO</div>
        <div className="flex-1 border-r-2 border-black p-3">Uraian Ketidaksesuaian</div>
        <div className="w-40 border-r-2 border-black p-3">Penyebab</div>
        <div className="w-40 border-r-2 border-black p-3">Rencana</div>
        <div className="w-20 border-r-2 border-black p-3">Status</div>
        <div className="flex-1 border-r-2 border-black p-3">Hasil Tindak Lanjut</div>
        <div className="w-36 p-3">Aksi</div>
      </div>

      {data.length === 0 ? (
        <div className="flex min-w-[1100px] border-t-2 border-black p-8 justify-center">
          <p className="text-gray-400 italic">Belum ada data rekapitulasi.</p>
        </div>
      ) : (
        data.map((item, index) => (
          <div
            key={`${item.id_boxing}-${index}`}
            className="flex min-w-[1100px] border-t-2 border-black text-[11px]"
          >
            <div className="w-12 border-r-2 border-black p-3 flex justify-center items-start">
              <span className="font-bold text-base">{index + 1}</span>
            </div>
            <div className="flex-1 border-r-2 border-black p-4">
              <p className="text-[9px] text-gray-400 italic mb-1">
                {item.kode_laporan}
                {item.nama_unit && ` · ${item.nama_unit}`}
              </p>
              <div className="border border-gray-400 p-3 h-24 font-bold text-[10px] overflow-auto uppercase">
                {item.uraian_ketidaksesuaian}
              </div>
            </div>
            <div className="w-40 border-r-2 border-black p-4 flex items-center justify-center">
              <span className="italic text-gray-500 text-center text-[10px]">
                {item.penyebab || "—"}
              </span>
            </div>
            <div className="w-40 border-r-2 border-black p-4 flex items-center justify-center">
              <span className="italic text-gray-500 text-center text-[10px]">
                {item.rencana_tindakan || "—"}
              </span>
            </div>
            <div className="w-20 border-r-2 border-black p-4 flex items-center justify-center">
              <span className="border border-gray-400 p-1 italic text-center w-full text-[9px]">
                selesai
              </span>
            </div>
            <div className="flex-1 border-r-2 border-black p-4">
              <div className="border border-gray-400 p-3 h-24 italic text-gray-500 overflow-auto">
                {item.tanggal_pelaksanaan && (
                  <span className="block font-bold not-italic text-gray-700 mb-1">
                    {new Date(item.tanggal_pelaksanaan).toLocaleDateString("id-ID")}
                  </span>
                )}
                {item.hasil_tindakan || "belum ada hasil"}
              </div>
            </div>
            <div className="w-36 p-4 flex flex-col justify-center gap-2">
              {item.status_review === "ditindaklanjuti" ? (
                <button
                  type="button"
                  onClick={() => ditindaklanjutiLagi(item.id_boxing)}
                  className="w-full border-2 border-orange-500 bg-orange-50 text-orange-800 text-[9px] font-bold py-2 leading-tight hover:bg-orange-100"
                >
                  ↻ Ditindaklanjuti lagi
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => ditindaklanjutiLagi(item.id_boxing)}
                  className="w-full border border-gray-400 text-[9px] py-2 hover:bg-gray-50"
                >
                  ↻ Buka kembali
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}