"use client";
import { useState, useEffect } from "react";
import { stafApi } from "@/lib/api";
import { exportPDFProses } from "@/lib/exportPdf";

interface ProsesItem {
  id_laporan: number;
  kode_laporan: string;
  id_boxing: number;
  jenis_laporan: string | null;
  isi_laporan: string | null;
  lampiran_laporan: string | null;
  status_laporan: string | null;
  nama_unit: string | null;
  status_boxing: string | null;
  status_review: string | null;
  aksi_masukan: string | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  catatan_kepala: string | null;
  hasil_tindakan: string | null;
  lampiran_hasil: string | null;
  tanggal_pelaksanaan: string | null;
  created_at?: string | null;
}

const reviewBadge: Record<string, { label: string; cls: string }> = {
  menunggu_keputusan_ka: { label: "⏳ Ke Ka P4M", cls: "text-blue-600 bg-blue-50" },
  ditindaklanjuti: { label: "✓ Ditindaklanjuti", cls: "text-green-600 bg-green-50" },
  tidak_ditindaklanjuti: { label: "✗ Tidak", cls: "text-red-600 bg-red-50" },
};

const boxingLabel: Record<string, string> = {
  terdistribusi: "Terdistribusi", diproses: "Diproses",
  menunggu_pelaksanaan: "Menunggu unit", di_staff: "Di Staf P4M", selesai: "Selesai",
};

export default function ProcessMonitorTable() {
  const [data, setData] = useState<ProsesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [exportingId, setExportingId] = useState<number | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try { setLoading(true); const res = await stafApi.getProsesMonitor(); setData(res.data); }
    catch { setError("Gagal memuat data proses."); }
    finally { setLoading(false); }
  }

  async function putuskan(id_boxing: number, keputusan: "selesai" | "belum" | "lanjut" | "ditindak_lanjut") {
    if (keputusan === "ditindak_lanjut") {
      const ok = confirm("Laporan akan ditindaklanjuti lagi. Lanjutkan?");
      if (!ok) return;
    }
    setError("");
    try {
      const res = await stafApi.setKeputusanBoxing(id_boxing, keputusan);
      setMsg(res.message); setTimeout(() => setMsg(""), 4000); fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
      setTimeout(() => setError(""), 4000);
    }
  }

  function handleExportPDF(item: ProsesItem) {
    setExportingId(item.id_boxing);
    exportPDFProses({
      kode_laporan: item.kode_laporan, jenis_laporan: item.jenis_laporan,
      isi_laporan: item.isi_laporan, nama_unit: item.nama_unit,
      status_boxing: item.status_boxing, status_review: item.status_review,
      aksi_masukan: item.aksi_masukan, penyebab: item.penyebab,
      rencana_tindakan: item.rencana_tindakan, hasil_tindakan: item.hasil_tindakan,
      lampiran_hasil: item.lampiran_hasil, tanggal_pelaksanaan: item.tanggal_pelaksanaan,
      created_at: item.created_at,
    });
    setTimeout(() => setExportingId(null), 1200);
  }

  const aktif = data.filter(d => d.status_boxing !== "selesai");
  const selesai = data.filter(d => d.status_boxing === "selesai");

  function renderCard(item: ProsesItem) {
    const rev = item.status_review ? reviewBadge[item.status_review] : null;
    const diStaff = item.status_boxing === "di_staff";
    const isSelesai = item.status_boxing === "selesai";
    const ditindak = item.status_review === "ditindaklanjuti";
    const tidakKa = item.status_review === "tidak_ditindaklanjuti";

    return (
      <div key={`${item.id_laporan}-${item.id_boxing}`} className="border-t-2 border-black p-4 space-y-3">
        {/* Header info */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-gray-700">{item.kode_laporan}</span>
            <span className="text-[10px] text-gray-400 ml-2">{item.nama_unit}</span>
            <div className="text-[10px] text-gray-400 mt-0.5 italic">{boxingLabel[item.status_boxing ?? ""] ?? item.status_boxing}</div>
          </div>
          <div className="flex items-center gap-2">
            {rev && <span className={`text-[9px] font-bold px-1.5 py-0.5 border rounded ${rev.cls}`}>{rev.label}</span>}
            <button type="button" onClick={() => handleExportPDF(item)} disabled={exportingId === item.id_boxing}
              className="flex items-center gap-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[9px] font-bold rounded">
              {exportingId === item.id_boxing
                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : "📄 PDF"}
            </button>
          </div>
        </div>

        {/* Isi laporan */}
        <div className="border border-gray-300 p-2 text-xs text-gray-700 max-h-20 overflow-auto bg-gray-50">{item.isi_laporan}</div>

        {/* Ka P4M masukan */}
        {item.aksi_masukan && (
          <p className="text-[10px] text-gray-500 italic border-l-2 border-blue-300 pl-2">{item.aksi_masukan}</p>
        )}

        {/* Hasil unit */}
        {item.hasil_tindakan && (
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Hasil Unit:</p>
            <div className="border border-gray-300 p-2 text-xs text-gray-700 max-h-16 overflow-auto">{item.hasil_tindakan}</div>
            {item.tanggal_pelaksanaan && (
              <p className="text-[9px] text-gray-400 mt-1">
                📅 {new Date(item.tanggal_pelaksanaan).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        )}

        {/* Aksi */}
        <div className="flex flex-wrap gap-2">
          {diStaff && (
            <>
              <button type="button" onClick={() => putuskan(item.id_boxing, "selesai")}
                className="flex-1 min-w-[120px] bg-green-600 text-white text-xs font-bold py-2 hover:bg-green-700 rounded">✓ Selesai</button>
              {ditindak && item.hasil_tindakan && (
                <button type="button" onClick={() => putuskan(item.id_boxing, "belum")}
                  className="flex-1 min-w-[120px] border border-black text-xs py-2 hover:bg-gray-50 rounded">Belum selesai</button>
              )}
            </>
          )}
          {isSelesai && ditindak && (
            <button type="button" onClick={() => putuskan(item.id_boxing, "ditindak_lanjut")}
              className="flex-1 min-w-[120px] border border-orange-500 bg-orange-50 text-orange-800 text-xs font-bold py-2 hover:bg-orange-100 rounded">↻ Tindak lagi</button>
          )}
          {isSelesai && tidakKa && (
            <button type="button" onClick={() => putuskan(item.id_boxing, "lanjut")}
              className="flex-1 min-w-[120px] border border-gray-500 text-xs py-2 hover:bg-gray-50 rounded">↻ Buka kembali</button>
          )}
          {!diStaff && !isSelesai && (
            <span className="text-[10px] text-gray-400 italic">Menunggu tahap sebelumnya</span>
          )}
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="w-full border-2 border-black bg-white p-10 text-center text-sm text-gray-400 italic">Memuat data…</div>
  );

  return (
    <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
      <p className="text-[10px] text-gray-500 px-3 py-2 bg-gray-50 border-b">
        Staf P4M menentukan selesai atau belum. Klik 📄 untuk export PDF per laporan.
      </p>
      {msg && <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b">{msg}</p>}
      {error && <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b">❌ {error}</p>}

      {/* DESKTOP: scrollable table */}
      <div className="hidden lg:block">
        <div className="flex min-w-[1100px] font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[10px]">
          <div className="w-[380px] border-r-2 border-black p-3">Laporan</div>
          <div className="w-[160px] border-r-2 border-black p-3">Keputusan Ka</div>
          <div className="w-[340px] border-r-2 border-black p-3">Hasil Unit</div>
          <div className="w-[160px] border-r-2 border-black p-3">Keputusan Staf</div>
          <div className="w-[60px] p-3">PDF</div>
        </div>

        {aktif.length === 0 && selesai.length === 0 ? (
          <div className="p-8 text-center text-gray-400 italic min-w-[1100px]">Belum ada laporan diproses.</div>
        ) : (
          <>
            {aktif.map((item) => {
              const rev = item.status_review ? reviewBadge[item.status_review] : null;
              const diStaff = item.status_boxing === "di_staff";
              const ditindak = item.status_review === "ditindaklanjuti";
              return (
                <div key={`${item.id_laporan}-${item.id_boxing}`} className="flex min-w-[1100px] border-t-2 border-black">
                  <div className="w-[380px] border-r-2 border-black p-3">
                    <p className="text-[9px] text-gray-400 mb-1 leading-tight">
                      <span className="font-bold">{item.kode_laporan}</span><br />
                      {item.nama_unit} · <span className="italic">{boxingLabel[item.status_boxing ?? ""] ?? item.status_boxing}</span>
                    </p>
                    <div className="border border-gray-400 p-2 h-16 text-[10px] overflow-auto">{item.isi_laporan}</div>
                  </div>
                  <div className="w-[160px] border-r-2 border-black p-3 flex flex-col gap-1 justify-center">
                    {rev && <span className={`text-[8px] font-bold px-1 py-1 border rounded text-center ${rev.cls}`}>{rev.label}</span>}
                    {item.aksi_masukan && <p className="text-[9px] text-gray-500 italic mt-1 line-clamp-2">{item.aksi_masukan}</p>}
                  </div>
                  <div className="w-[340px] border-r-2 border-black p-3">
                    <div className="border border-gray-300 p-2 h-16 text-[10px] overflow-auto">
                      {item.hasil_tindakan || (item.status_review === "tidak_ditindaklanjuti" ? "— (tidak ditindaklanjuti)" : "Belum ada hasil")}
                    </div>
                    {item.tanggal_pelaksanaan && (
                      <p className="text-[9px] text-gray-400 mt-1">
                        📅 {new Date(item.tanggal_pelaksanaan).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="w-[160px] border-r-2 border-black p-3 flex flex-col gap-1.5 justify-center">
                    {diStaff && (
                      <>
                        <button type="button" onClick={() => putuskan(item.id_boxing, "selesai")}
                          className="w-full bg-green-600 text-white text-[10px] font-bold py-1.5 hover:bg-green-700">✓ Selesai</button>
                        {ditindak && item.hasil_tindakan && (
                          <button type="button" onClick={() => putuskan(item.id_boxing, "belum")}
                            className="w-full border border-black text-[10px] py-1 hover:bg-gray-50">Belum selesai</button>
                        )}
                      </>
                    )}
                    {!diStaff && <span className="text-[9px] text-gray-400 italic text-center">Menunggu tahap sebelumnya</span>}
                  </div>
                  <div className="w-[60px] p-3 flex items-center justify-center">
                    <button type="button" onClick={() => handleExportPDF(item)} disabled={exportingId === item.id_boxing}
                      className="flex flex-col items-center gap-1 px-2 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[9px] font-bold rounded">
                      {exportingId === item.id_boxing
                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><span className="text-base leading-none">📄</span><span>PDF</span></>}
                    </button>
                  </div>
                </div>
              );
            })}
            {selesai.length > 0 && (
              <>
                <div className="bg-gray-100 px-3 py-1 text-[10px] font-bold uppercase border-t-2 border-black min-w-[1100px]">
                  Sudah selesai (bisa dilanjutkan / dibuka kembali)
                </div>
                {selesai.map((item) => {
                  const rev = item.status_review ? reviewBadge[item.status_review] : null;
                  const isSelesai = item.status_boxing === "selesai";
                  const ditindak = item.status_review === "ditindaklanjuti";
                  const tidakKa = item.status_review === "tidak_ditindaklanjuti";
                  return (
                    <div key={`${item.id_laporan}-${item.id_boxing}`} className="flex min-w-[1100px] border-t-2 border-black">
                      <div className="w-[380px] border-r-2 border-black p-3">
                        <p className="text-[9px] text-gray-400 mb-1 leading-tight">
                          <span className="font-bold">{item.kode_laporan}</span><br />
                          {item.nama_unit} · <span className="italic">Selesai</span>
                        </p>
                        <div className="border border-gray-400 p-2 h-16 text-[10px] overflow-auto">{item.isi_laporan}</div>
                      </div>
                      <div className="w-[160px] border-r-2 border-black p-3 flex flex-col gap-1 justify-center">
                        {rev && <span className={`text-[8px] font-bold px-1 py-1 border rounded text-center ${rev.cls}`}>{rev.label}</span>}
                        {item.aksi_masukan && <p className="text-[9px] text-gray-500 italic mt-1 line-clamp-2">{item.aksi_masukan}</p>}
                      </div>
                      <div className="w-[340px] border-r-2 border-black p-3">
                        <div className="border border-gray-300 p-2 h-16 text-[10px] overflow-auto">
                          {item.hasil_tindakan || (tidakKa ? "— (tidak ditindaklanjuti)" : "Belum ada hasil")}
                        </div>
                        {item.tanggal_pelaksanaan && (
                          <p className="text-[9px] text-gray-400 mt-1">
                            📅 {new Date(item.tanggal_pelaksanaan).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                      <div className="w-[160px] border-r-2 border-black p-3 flex flex-col gap-1.5 justify-center">
                        {isSelesai && ditindak && (
                          <button type="button" onClick={() => putuskan(item.id_boxing, "ditindak_lanjut")}
                            className="w-full border border-orange-500 bg-orange-50 text-orange-800 text-[10px] font-bold py-1.5 hover:bg-orange-100">↻ Tindak lagi</button>
                        )}
                        {isSelesai && tidakKa && (
                          <button type="button" onClick={() => putuskan(item.id_boxing, "lanjut")}
                            className="w-full border border-gray-500 text-[10px] py-1.5 hover:bg-gray-50">↻ Buka kembali</button>
                        )}
                      </div>
                      <div className="w-[60px] p-3 flex items-center justify-center">
                        <button type="button" onClick={() => handleExportPDF(item)} disabled={exportingId === item.id_boxing}
                          className="flex flex-col items-center gap-1 px-2 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[9px] font-bold rounded">
                          {exportingId === item.id_boxing
                            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <><span className="text-base leading-none">📄</span><span>PDF</span></>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>

      {/* MOBILE/TABLET: card layout */}
      <div className="lg:hidden">
        {aktif.length === 0 && selesai.length === 0 ? (
          <div className="p-8 text-center text-gray-400 italic">Belum ada laporan diproses.</div>
        ) : (
          <>
            {aktif.map(renderCard)}
            {selesai.length > 0 && (
              <>
                <div className="bg-gray-100 px-3 py-2 text-[10px] font-bold uppercase border-t-2 border-black">
                  Sudah selesai
                </div>
                {selesai.map(renderCard)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}