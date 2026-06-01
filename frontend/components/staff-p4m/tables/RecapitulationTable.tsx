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

export default function RecapitulationTable() {
  const [data, setData] = useState<RekapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

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

      <div className="flex gap-1 items-center p-2 mb-1 text-[9px]">
        <span>📥 EXPORT : [</span>
        <button type="button" className="text-blue-700 hover:underline" disabled>
          PDF
        </button>
        <span>] [</span>
        <button type="button" className="text-blue-700 hover:underline" disabled>
          Excel
        </button>
        <span>]</span>
      </div>

      <div className="flex min-w-[1100px] font-bold uppercase border-t border-black bg-gray-50 text-center">
        <div className="w-12 border-r-2 border-black p-3">NO</div>
        <div className="flex-1 border-r-2 border-black p-3">Uraian Ketidaksesuaian</div>
        <div className="w-40 border-r-2 border-black p-3">Penyebab</div>
        <div className="w-40 border-r-2 border-black p-3">Rencana</div>
        <div className="w-20 border-r-2 border-black p-3">Status</div>
        <div className="flex-1 border-r-2 border-black p-3">Hasil tindak lanjut</div>
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
