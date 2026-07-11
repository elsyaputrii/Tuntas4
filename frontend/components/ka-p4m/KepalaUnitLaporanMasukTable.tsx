// FILE: frontend/components/ka-p4m/KepalaUnitLaporanMasukTable.tsx
// Read-only monitor untuk Ka P4M: lihat semua "Ketidaksesuaian Masuk"
// milik Kepala Unit (semua unit), tanpa bisa mengedit apa pun.
"use client";
import { useState, useEffect, useCallback } from "react";
import { kaP4MApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

interface LaporanItem {
  id_boxing: number;
  id_laporan: number;
  kode_laporan: string;
  unit_tujuan: string;
  jenis_laporan: string;
  isi_laporan: string;
  lampiran_laporan: string | null;
  status_boxing: string;
  penyebab: string | null;
  rencana_tindakan: string | null;
  status_review: string | null;
  catatan_review: string | null;
  created_at?: string | null;
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  menunggu_review: { label: "⏳ Menunggu Review Staf P4M", cls: "text-blue-500 bg-blue-50 border-blue-200" },
  disetujui: { label: "✓ Disetujui", cls: "text-green-600 bg-green-50 border-green-200" },
  tidak_disetujui: { label: "✗ Tidak Disetujui", cls: "text-red-500 bg-red-50 border-red-200" },
  revisi: { label: "⚠ Perlu Revisi", cls: "text-yellow-600 bg-yellow-50 border-yellow-200" },
};

function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export default function KepalaUnitLaporanMasukTable() {
  const [laporanList, setLaporanList] = useState<LaporanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [modalSrc, setModalSrc] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const result = await kaP4MApi.getKepalaUnitLaporanMasuk();
      if (result.success) setLaporanList(result.data);
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : "Gagal memuat data laporan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading)
    return (
      <div className="w-full border-2 border-black bg-white p-12 text-center">
        <div className="w-6 h-6 border-4 border-blue-polibatam border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs">Memuat data laporan...</p>
      </div>
    );

  if (errMsg)
    return (
      <div className="w-full border-2 border-red-400 bg-red-50 p-8 text-center">
        <p className="text-red-500 text-sm">{errMsg}</p>
        <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-blue-polibatam text-white text-xs rounded">
          Coba Lagi
        </button>
      </div>
    );

  if (laporanList.length === 0)
    return (
      <div className="w-full border-2 border-black bg-white p-12 text-center">
        <p className="text-gray-400 text-sm italic">Belum ada laporan yang didistribusikan ke unit manapun.</p>
      </div>
    );

  return (
    <>
      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)} />}

      <div className="w-full border-2 border-black bg-white overflow-hidden text-sm">
        <div className="hidden sm:flex font-semibold uppercase bg-gray-50 border-b-2 border-black text-center">
          <div className="w-[25%] border-r-2 border-black p-3 text-[11px]">Laporan</div>
          <div className="w-[12%] border-r-2 border-black p-3 text-[11px]">Unit Tujuan</div>
          <div className="w-[12%] border-r-2 border-black p-3 text-[11px]">Tanggal Masuk</div>
          <div className="w-[20%] border-r-2 border-black p-3 text-[11px]">Penyebab</div>
          <div className="w-[20%] border-r-2 border-black p-3 text-[11px]">Rencana Tindak Lanjut</div>
          <div className="flex-1 p-3 text-[11px]">Status</div>
        </div>

        {laporanList.map((item, idx) => {
          const badge = item.status_review ? statusBadge[item.status_review] : null;
          return (
            <div key={item.id_boxing} className={`${idx > 0 ? "border-t-2 border-black" : ""}`}>
              {/* MOBILE CARD */}
              <div className="sm:hidden p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.kode_laporan}</span>
                  <span className="text-[10px] text-gray-400 capitalize">{item.jenis_laporan}</span>
                  <span className="text-[10px] font-semibold text-blue-polibatam bg-blue-50 px-2 py-0.5 rounded">{item.unit_tujuan}</span>
                </div>
                <p className="text-[10px] text-gray-500">📅 {fmtDate(item.created_at)}</p>
                <p className="text-xs text-black leading-relaxed">{item.isi_laporan}</p>
                {item.lampiran_laporan && (
                  <button
                    onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran_laporan}`)}
                    className="text-[10px] text-blue-500 hover:underline"
                  >
                    🖼️ Lihat Gambar
                  </button>
                )}
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Penyebab</p>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{item.penyebab || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rencana Tindak Lanjut</p>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{item.rencana_tindakan || "—"}</p>
                </div>
                {badge && <div className={`px-2 py-1 border rounded text-[10px] font-medium inline-block ${badge.cls}`}>{badge.label}</div>}
              </div>

              {/* DESKTOP ROW */}
              <div className="hidden sm:flex min-h-32">
                <div className="w-[25%] border-r-2 border-black p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.kode_laporan}</span>
                    <span className="text-[10px] text-gray-400 capitalize">{item.jenis_laporan}</span>
                  </div>
                  <p className="text-xs text-black leading-relaxed">{item.isi_laporan}</p>
                  {item.lampiran_laporan && (
                    <button
                      onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran_laporan}`)}
                      className="mt-2 text-[10px] text-blue-500 hover:underline"
                    >
                      🖼️ Lihat Gambar
                    </button>
                  )}
                </div>
                <div className="w-[12%] border-r-2 border-black p-5 flex items-center justify-center text-center">
                  <span className="text-xs font-semibold text-blue-polibatam">{item.unit_tujuan}</span>
                </div>
                <div className="w-[12%] border-r-2 border-black p-5 flex items-center justify-center">
                  <span className="text-xs text-gray-700">{fmtDate(item.created_at)}</span>
                </div>
                <div className="w-[20%] border-r-2 border-black p-5">
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{item.penyebab || "—"}</p>
                </div>
                <div className="w-[20%] border-r-2 border-black p-5">
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{item.rencana_tindakan || "—"}</p>
                </div>
                <div className="flex-1 p-5 flex items-center justify-center">
                  {badge ? (
                    <div className={`px-2 py-1 border rounded text-[10px] font-medium text-center ${badge.cls}`}>{badge.label}</div>
                  ) : (
                    <span className="text-[10px] text-gray-400">Belum diisi</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}