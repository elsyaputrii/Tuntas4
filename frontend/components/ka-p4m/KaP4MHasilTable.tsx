"use client";
// FILE: frontend/components/ka-p4m/KaP4MHasilTable.tsx
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { kaP4MApi } from "@/lib/api"; // ← GANTI dari stafApi ke kaP4MApi

interface HasilItem {
  id_laporan:          number;
  kode_laporan:        string;
  id_boxing:           number;
  jenis_laporan:       string;
  isi_laporan:         string;
  nama_unit:           string;
  penyebab:            string | null;
  rencana_tindakan:    string | null;
  status_review:       string | null;
  hasil_tindakan:      string | null;
  lampiran_hasil:      string | null;
  tanggal_pelaksanaan: string | null;
  status_laporan:      string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

export default function KaP4MHasilTable() {
  const [data,    setData]    = useState<HasilItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [msgOk,   setMsgOk]   = useState("");

  // ✅ PERBAIKAN: pakai kaP4MApi.getProsesMonitor() bukan stafApi.getProsesMonitor()
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await kaP4MApi.getProsesMonitor();
      // Filter: hanya tampilkan yang rancangan sudah disetujui DAN ada hasil pelaksanaan
      const filtered = (res.data as HasilItem[]).filter(
        (item) => item.status_review === "disetujui" && item.hasil_tindakan
      );
      setData(filtered);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ✅ PERBAIKAN: pakai kaP4MApi.setStatusLaporan() bukan stafApi.setStatusLaporan()
  async function handleKeputusan(id_laporan: number, keputusan: "selesai" | "diproses") {
    try {
      await kaP4MApi.setStatusLaporan(id_laporan, keputusan);
      setMsgOk(
        keputusan === "selesai"
          ? "✅ Laporan dinyatakan SELESAI oleh Ka P4M."
          : "🔄 Laporan dikembalikan ke status DIPROSES."
      );
      setTimeout(() => setMsgOk(""), 4000);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status.");
      setTimeout(() => setError(""), 3000);
    }
  }

  if (loading) {
    return (
      <div className="w-full border-2 border-black bg-white p-12 text-center">
        <div className="w-6 h-6 border-4 border-[#5da0dd] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs">Memuat laporan pemantauan...</p>
      </div>
    );
  }

  return (
    <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
      {msgOk && (
        <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b border-green-200">{msgOk}</p>
      )}
      {error && (
        <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b border-red-200">❌ {error}</p>
      )}

      {/* Header */}
      <div className="flex font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[11px]">
        <div className="flex-1 border-r-2 border-black p-3">Kritik / Pengaduan</div>
        <div className="w-[18%] border-r-2 border-black p-3">Rencana Tindakan</div>
        <div className="w-[22%] border-r-2 border-black p-3">Hasil Tindak Lanjut</div>
        <div className="w-[12%] border-r-2 border-black p-3">Status</div>
        <div className="w-[16%] p-3">Keputusan Ka P4M</div>
      </div>

      {data.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-gray-400 italic text-sm">
            Belum ada laporan hasil pelaksanaan yang perlu diputuskan.
          </p>
          <p className="text-gray-300 text-xs mt-1">
            (Tampil setelah Kepala Unit mengisi laporan hasil pelaksanaan)
          </p>
        </div>
      ) : (
        data.map((item, idx) => (
          <div
            key={`${item.id_boxing}-${idx}`}
            className={`flex min-h-[180px] ${idx > 0 ? "border-t-2 border-black" : ""}`}
          >
            {/* Kolom Laporan */}
            <div className="flex-1 border-r-2 border-black p-5">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {item.kode_laporan}
                </span>
                <span className="text-[10px] text-gray-400 capitalize">{item.jenis_laporan}</span>
                <span className="text-[10px] text-[#5da0dd] font-semibold">📍 {item.nama_unit}</span>
              </div>
              <div className="border border-gray-300 p-3 h-24 text-[11px] italic text-gray-500 overflow-auto">
                {item.isi_laporan}
              </div>
              {item.penyebab && (
                <p className="text-[10px] text-gray-500 mt-2">
                  <span className="font-semibold">Penyebab:</span> {item.penyebab}
                </p>
              )}
            </div>

            {/* Kolom Rencana */}
            <div className="w-[18%] border-r-2 border-black p-5">
              <div className="border border-gray-300 p-2 h-28 text-[11px] text-gray-600 overflow-auto">
                {item.rencana_tindakan || <span className="italic text-gray-300">—</span>}
              </div>
            </div>

            {/* Kolom Hasil Tindak Lanjut */}
            <div className="w-[22%] border-r-2 border-black p-5">
              <div className="border border-gray-300 p-3 h-24 text-[11px] text-gray-600 overflow-auto">
                {item.tanggal_pelaksanaan && (
                  <span className="block font-bold text-gray-700 mb-1 not-italic">
                    📅 {new Date(item.tanggal_pelaksanaan).toLocaleDateString("id-ID", {
                      day: "2-digit", month: "long", year: "numeric",
                    })}
                  </span>
                )}
                <span className="italic">{item.hasil_tindakan}</span>
              </div>
              {item.lampiran_hasil && (
                <a
                  href={`${BASE_URL}/uploads/${item.lampiran_hasil}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#5da0dd] hover:underline mt-1 block"
                >
                  🖼️ Lihat Lampiran
                </a>
              )}
            </div>

            {/* Kolom Status */}
            <div className="w-[12%] border-r-2 border-black p-5 flex items-center justify-center">
              <span
                className={`text-[10px] font-bold text-center ${
                  item.status_laporan === "selesai" ? "text-green-600" : "text-blue-600"
                }`}
              >
                {item.status_laporan === "selesai" ? "✓ Selesai" : "🔄 Diproses"}
              </span>
            </div>

            {/* Kolom Keputusan Ka P4M */}
            <div className="w-[16%] p-5 flex flex-col gap-2 justify-center items-center">
              {item.status_laporan !== "selesai" ? (
                <>
                  <button
                    onClick={() => handleKeputusan(item.id_laporan, "selesai")}
                    className="w-full bg-green-600 text-white text-[10px] font-bold py-2 hover:bg-green-700 shadow transition-all"
                  >
                    ✓ Selesai / Close
                  </button>
                  <button
                    onClick={() => handleKeputusan(item.id_laporan, "diproses")}
                    className="w-full border border-black text-[10px] py-1.5 hover:bg-gray-100"
                  >
                    🔄 Kembalikan
                  </button>
                </>
              ) : (
                <span className="text-green-600 text-[11px] font-bold text-center">
                  ✓ Sudah Diputuskan<br />Selesai
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}