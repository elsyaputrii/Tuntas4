"use client";
import { useState, useEffect } from "react";
import { stafApi } from "@/lib/api";

interface RekapItem {
  id_laporan:              number;
  kode_laporan:            string;
  jenis_laporan:           string;
  uraian_ketidaksesuaian:  string;
  lampiran_laporan:        string | null;
  status_laporan:          string;
  nama_unit:               string | null;
  penyebab:                string | null;
  rencana_tindakan:        string | null;
  status_review:           string | null;
  hasil_tindakan:          string | null;
  lampiran_hasil:          string | null;
  tanggal_pelaksanaan:     string | null;
}

export default function RecapitulationTable() {
  const [data,    setData]    = useState<RekapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    stafApi.getRekapitulasi()
      .then((res) => setData(res.data))
      .catch(() => setError("Gagal memuat data rekapitulasi."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full border-2 border-black bg-white p-10 text-center text-sm text-gray-400 italic">
        Memuat data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full border-2 border-black bg-white p-10 text-center text-sm text-red-500">
        ❌ {error}
      </div>
    );
  }

  return (
    // Wrapper sama persis dengan aslinya
    <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">

      {/* Tombol Export — sama persis */}
      <div className="flex gap-1 items-center p-2 mb-1 text-[9px]">
        <span>📥 EXPORT : [</span>
        <button className="text-blue-700 hover:underline">PDF</button>
        <span>] [</span>
        <button className="text-blue-700 hover:underline">Excel</button>
        <span>] [</span>
        <button className="text-blue-700 hover:underline">jpg</button>
        <span>]</span>
      </div>

      {/* Header Tabel — sama persis */}
      <div className="flex min-w-[1000px] font-bold uppercase border-t border-black bg-gray-50 text-center">
        <div className="w-12  border-r-2 border-black p-3">NO</div>
        <div className="flex-1 border-r-2 border-black p-3">Uraian Ketidaksesuaian</div>
        <div className="w-48  border-r-2 border-black p-3">Penyebab</div>
        <div className="w-48  border-r-2 border-black p-3">Rencana tindak lanjut</div>
        <div className="w-24  border-r-2 border-black p-3">status</div>
        <div className="flex-1 p-3">Hasil tindak lanjut</div>
      </div>

      {/* Kalau tidak ada data */}
      {data.length === 0 ? (
        <div className="flex min-w-[1000px] border-t-2 border-black p-8 justify-center">
          <p className="text-gray-400 italic">Belum ada data rekapitulasi.</p>
        </div>
      ) : (
        data.map((item, index) => (
          <div key={item.id_laporan} className="flex min-w-[1000px] border-t-2 border-black text-[11px]">

            {/* Kolom No — sama persis */}
            <div className="w-12 border-r-2 border-black p-3 flex justify-center items-start">
              <span className="font-bold text-base">{index + 1}</span>
            </div>

            {/* Kolom Uraian — sama persis */}
            <div className="flex-1 border-r-2 border-black p-4 relative">
              <p className="text-[9px] text-gray-400 italic mb-1">
                {item.kode_laporan}
                {item.nama_unit && ` · ${item.nama_unit}`}
              </p>
              <div className="border border-gray-400 p-3 h-24 uppercase font-bold text-[10px] overflow-auto">
                {item.uraian_ketidaksesuaian}
              </div>
              {item.lampiran_laporan && (
                <button className="absolute bottom-4 left-4 border border-black px-1 flex gap-1 text-[9px] hover:bg-gray-100">
                  🖼️ lihat gambar
                </button>
              )}
            </div>

            {/* Kolom Penyebab — sama persis */}
            <div className="w-48 border-r-2 border-black p-4 flex items-center justify-center">
              <div className="italic text-gray-500 text-center">
                {item.penyebab || "di isi kepala unit"}
              </div>
            </div>

            {/* Kolom Rencana — sama persis */}
            <div className="w-48 border-r-2 border-black p-4 flex items-center justify-center">
              <div className="italic text-gray-500 text-center">
                {item.rencana_tindakan || "di isi kepala unit"}
              </div>
            </div>

            {/* Kolom Status — sama persis */}
            <div className="w-24 border-r-2 border-black p-4 flex items-center justify-center">
              <div className="border border-gray-400 p-1 italic text-center w-full">
                {item.status_laporan}
              </div>
            </div>

            {/* Kolom Hasil — sama persis */}
            <div className="flex-1 p-4 relative">
              <div className="border border-gray-400 p-3 h-24 italic text-gray-500 overflow-auto">
                {item.tanggal_pelaksanaan && (
                  <span className="block font-bold not-italic text-gray-700 mb-1">
                    {new Date(item.tanggal_pelaksanaan).toLocaleDateString("id-ID")}
                  </span>
                )}
                {item.hasil_tindakan || "belum ada hasil"}
              </div>
              {item.lampiran_hasil && (
                <button className="absolute bottom-4 left-4 border border-black px-1 flex gap-1 text-[9px] hover:bg-gray-100">
                  🖼️ lihat gambar
                </button>
              )}
            </div>

          </div>
        ))
      )}
    </div>
  );
}