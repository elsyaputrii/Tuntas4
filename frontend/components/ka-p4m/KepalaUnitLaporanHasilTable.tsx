// FILE: frontend/components/ka-p4m/KepalaUnitLaporanHasilTable.tsx
// Read-only monitor untuk Ka P4M: lihat semua "Laporan Hasil"
// milik Kepala Unit (semua unit), tanpa bisa mengedit apa pun.
"use client";
import { useState, useEffect, useCallback } from "react";
import { kaP4MApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

interface LaporanHasilItem {
  id_boxing: number;
  id_laporan: number;
  kode_laporan: string;
  unit_tujuan: string;
  isi_laporan: string;
  penyebab: string;
  rencana_tindakan: string;
  status_review: string;
  status_boxing: string;
  aksi_masukan: string | null;
  id_pelaksanaan: number | null;
  hasil_tindakan: string | null;
  lampiran_hasil: string | null;
  tanggal_pelaksanaan: string | null;
  tanggal_laporan: string | null;
  tanggal_ditindaklanjuti: string | null;
}

function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export default function KepalaUnitLaporanHasilTable() {
  const [laporanList, setLaporanList] = useState<LaporanHasilItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [modalSrc, setModalSrc] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const result = await kaP4MApi.getKepalaUnitLaporanHasil();
      if (result.success) setLaporanList(result.data);
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : "Gagal memuat data.");
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
        <p className="text-gray-400 text-sm italic">Belum ada laporan hasil dari unit manapun.</p>
      </div>
    );

  return (
    <>
      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)} />}

      <div className="w-full border-2 border-black bg-white overflow-hidden text-sm">
        <div className="hidden sm:flex font-semibold uppercase bg-gray-50 border-b-2 border-black text-center">
          <div className="w-[22%] border-r-2 border-black p-3 text-[11px]">Laporan</div>
          <div className="w-[10%] border-r-2 border-black p-3 text-[11px]">Unit</div>
          <div className="w-[18%] border-r-2 border-black p-3 text-[11px]">Rencana Tindak Lanjut</div>
          <div className="w-[22%] border-r-2 border-black p-3 text-[11px]">Hasil Pelaksanaan</div>
          <div className="w-[13%] border-r-2 border-black p-3 text-[11px]">Tanggal Pelaksanaan</div>
          <div className="flex-1 p-3 text-[11px]">Status</div>
        </div>

        {laporanList.map((item, idx) => (
          <div key={item.id_boxing} className={`${idx > 0 ? "border-t-2 border-black" : ""}`}>
            {/* MOBILE CARD */}
            <div className="sm:hidden p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.kode_laporan}</span>
                <span className="text-[10px] font-semibold text-blue-polibatam bg-blue-50 px-2 py-0.5 rounded">{item.unit_tujuan}</span>
              </div>
              <p className="text-xs text-black leading-relaxed">{item.isi_laporan}</p>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rencana Tindak Lanjut</p>
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{item.rencana_tindakan || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Hasil Pelaksanaan</p>
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{item.hasil_tindakan || "Belum dilaksanakan"}</p>
              </div>
              {item.lampiran_hasil && (
                <button
                  onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran_hasil}`)}
                  className="text-[10px] text-blue-500 hover:underline"
                >
                  🖼️ Lihat Bukti Pelaksanaan
                </button>
              )}
              <p className="text-[10px] text-gray-500">📅 Pelaksanaan: {fmtDate(item.tanggal_pelaksanaan)}</p>
              <span className="text-[10px] font-medium px-2 py-0.5 border rounded inline-block bg-gray-50">
                {item.status_boxing === "selesai" ? "✓ Selesai" : item.hasil_tindakan ? "⏳ Menunggu Verifikasi Staf" : "Belum Dilaksanakan"}
              </span>
            </div>

            {/* DESKTOP ROW */}
            <div className="hidden sm:flex min-h-32">
              <div className="w-[22%] border-r-2 border-black p-5">
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.kode_laporan}</span>
                <p className="text-xs text-black leading-relaxed mt-2">{item.isi_laporan}</p>
              </div>
              <div className="w-[10%] border-r-2 border-black p-5 flex items-center justify-center text-center">
                <span className="text-xs font-semibold text-blue-polibatam">{item.unit_tujuan}</span>
              </div>
              <div className="w-[18%] border-r-2 border-black p-5">
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{item.rencana_tindakan || "—"}</p>
              </div>
              <div className="w-[22%] border-r-2 border-black p-5">
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{item.hasil_tindakan || "Belum dilaksanakan"}</p>
                {item.lampiran_hasil && (
                  <button
                    onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran_hasil}`)}
                    className="mt-2 text-[10px] text-blue-500 hover:underline"
                  >
                    🖼️ Lihat Bukti
                  </button>
                )}
              </div>
              <div className="w-[13%] border-r-2 border-black p-5 flex items-center justify-center text-center">
                <span className="text-xs text-gray-700">{fmtDate(item.tanggal_pelaksanaan)}</span>
              </div>
              <div className="flex-1 p-5 flex items-center justify-center text-center">
                <span className="text-[10px] font-medium px-2 py-1 border rounded bg-gray-50">
                  {item.status_boxing === "selesai" ? "✓ Selesai" : item.hasil_tindakan ? "⏳ Menunggu Verifikasi Staf" : "Belum Dilaksanakan"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}