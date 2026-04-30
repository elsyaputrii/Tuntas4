"use client";
import { useState, useEffect } from "react";
import { stafApi } from "@/lib/api";

interface ProsesItem {
  id_laporan:          number;
  kode_laporan:        string;
  id_boxing:           number;
  jenis_laporan:       string;
  isi_laporan:         string;
  lampiran_laporan:    string | null;
  status_laporan:      string;
  nama_unit:           string;
  penyebab:            string | null;
  rencana_tindakan:    string | null;
  status_review:       string | null;
  hasil_tindakan:      string | null;
  lampiran_hasil:      string | null;
  tanggal_pelaksanaan: string | null;
}

export default function ProcessMonitorTable() {
  const [data,    setData]    = useState<ProsesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [msgStatus, setMsgStatus] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await stafApi.getProsesMonitor();
      setData(res.data);
    } catch {
      setError("Gagal memuat data proses.");
    } finally {
      setLoading(false);
    }
  }

  // Fungsi CLOSE → ubah status jadi 'selesai'
  async function handleClose(id_laporan: number) {
    try {
      await stafApi.setStatusLaporan(id_laporan, "selesai");
      setMsgStatus("✅ Laporan berhasil di-CLOSE (selesai).");
      setTimeout(() => setMsgStatus(""), 3000);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status.");
      setTimeout(() => setError(""), 3000);
    }
  }

  // Fungsi OPEN → ubah status jadi 'diproses'
  async function handleOpen(id_laporan: number) {
    try {
      await stafApi.setStatusLaporan(id_laporan, "diproses");
      setMsgStatus("✅ Laporan berhasil di-OPEN (diproses).");
      setTimeout(() => setMsgStatus(""), 3000);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status.");
      setTimeout(() => setError(""), 3000);
    }
  }

  if (loading) {
    return (
      <div className="w-full border-2 border-black bg-white p-10 text-center text-sm text-gray-400 italic">
        Memuat data...
      </div>
    );
  }

  return (
    // Wrapper sama persis dengan aslinya
    <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">

      {/* Pesan status */}
      {msgStatus && (
        <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b border-green-200">
          {msgStatus}
        </p>
      )}
      {error && (
        <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b border-red-200">
          ❌ {error}
        </p>
      )}

      {/* Header Tabel — sama persis */}
      <div className="flex min-w-[1200px] font-bold uppercase bg-gray-50 text-center">
        <div className="flex-1 border-r-2 border-black p-3">Kritik atau Pengaduan Terkait Polibatam</div>
        <div className="w-32  border-r-2 border-black p-3">Penyebab</div>
        <div className="w-48  border-r-2 border-black p-3">Rencana Tindak Lanjut</div>
        <div className="w-24  border-r-2 border-black p-3">Status</div>
        <div className="w-64  border-r-2 border-black p-3">Hasil Tindak Lanjut</div>
        <div className="w-36  border-r-2 border-black p-3">Recapt Pencapaian</div>
        <div className="w-40  p-3">EXPORT REPORT</div>
      </div>

      {/* Kalau belum ada data */}
      {data.length === 0 ? (
        <div className="flex min-w-[1200px] border-t-2 border-black p-8 justify-center">
          <p className="text-gray-400 italic">Belum ada laporan yang sedang diproses.</p>
        </div>
      ) : (
        data.map((item) => (
          <div key={item.id_laporan} className="flex min-w-[1200px] border-t-2 border-black">

            {/* Kolom 1: Isi laporan — sama persis */}
            <div className="flex-1 border-r-2 border-black p-4">
              <p className="text-[9px] text-gray-400 italic mb-1">
                {item.kode_laporan} · {item.jenis_laporan} · {item.nama_unit}
              </p>
              <div className="border border-gray-400 p-3 h-28 italic text-gray-500 overflow-auto">
                {item.isi_laporan}
              </div>
            </div>

            {/* Kolom 2: Penyebab — sama persis */}
            <div className="w-32 border-r-2 border-black p-4">
              <div className="border border-gray-400 p-2 h-20 italic text-gray-500 text-[10px] overflow-auto">
                {item.penyebab || "di isi kepala unit"}
              </div>
            </div>

            {/* Kolom 3: Rencana — sama persis */}
            <div className="w-48 border-r-2 border-black p-4">
              <div className="border border-gray-400 p-2 h-20 italic text-gray-500 text-[10px] overflow-auto">
                {item.rencana_tindakan || "di isi kepala unit"}
              </div>
            </div>

            {/* Kolom 4: Status — sama persis */}
            <div className="w-24 border-r-2 border-black p-4 flex items-start justify-center">
              <div className="font-semibold text-center mt-2 text-[10px]">
                {item.status_review
                  ? item.status_review.replace(/_/g, " ")
                  : "menunggu"}
              </div>
            </div>

            {/* Kolom 5: Hasil Tindak Lanjut — sama persis */}
            <div className="w-64 border-r-2 border-black p-4 relative">
              <div className="border border-gray-400 p-3 h-28 italic text-gray-500 text-[10px] overflow-auto">
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

            {/* Kolom 6: Recap — CLOSE/OPEN sekarang fungsional */}
            <div className="w-36 border-r-2 border-black p-4 flex flex-col gap-2 justify-center">
              <button
                onClick={() => handleClose(item.id_laporan)}
                className="w-full border border-black py-1 text-[10px] hover:bg-gray-100"
              >
                CLOSE
              </button>
              <button
                onClick={() => handleOpen(item.id_laporan)}
                className="w-full border border-black py-1 text-[10px] hover:bg-gray-100"
              >
                OPEN
              </button>
            </div>

            {/* Kolom 7: Export — sama persis */}
            <div className="w-40 p-4 flex gap-2 justify-center items-center">
              <button className="border border-black px-3 py-1 text-[10px] hover:bg-gray-100">PDF</button>
              <button className="border border-black px-2 py-1 text-[10px] hover:bg-gray-100">EXCEL</button>
            </div>

          </div>
        ))
      )}
    </div>
  );
}