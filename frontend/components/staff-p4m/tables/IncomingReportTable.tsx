// FILE: frontend/components/staff-p4m/tables/IncomingReportTable.tsx

"use client";
import { useState, useEffect } from "react";
import { stafApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

interface LaporanMasuk {
  id_laporan:    number;
  kode_laporan:  string;
  jenis_laporan: string;
  deskripsi:     string;
  lampiran:      string | null;
  status:        string;
  created_at:    string;
}

interface KepalaUnit {
  id_kepala: number;
  nama:      string;
  unit:      string;
}

export default function IncomingReportTable() {
  const [laporan,        setLaporan]        = useState<LaporanMasuk[]>([]);
  const [kepalaList,     setKepalaList]     = useState<KepalaUnit[]>([]);
  const [selectedKepala, setSelectedKepala] = useState<Record<number, number>>({});
  const [loading,        setLoading]        = useState(true);
  const [loadingKirim,   setLoadingKirim]   = useState<number | null>(null);
  const [error,          setError]          = useState("");
  const [successMsg,     setSuccessMsg]     = useState("");

  // State untuk modal gambar
  const [modalSrc, setModalSrc] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [resLaporan, resKepala] = await Promise.all([
        stafApi.getLaporanMasuk(),
        stafApi.getKepalaUnit(),
      ]);
      setLaporan(resLaporan.data);
      setKepalaList(resKepala.data);
    } catch {
      setError("Gagal memuat data. Pastikan kamu sudah login.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(id_laporan: number) {
    const id_kepala = selectedKepala[id_laporan];

    if (!id_kepala) {
      setError("Pilih unit tujuan terlebih dahulu!");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setError("");
    setSuccessMsg("");

    try {
      setLoadingKirim(id_laporan);
      await stafApi.distribusiLaporan({ id_laporan, id_kepala });

      const kode = `LAP-${String(id_laporan).padStart(5, "0")}`;
      setSuccessMsg(`✅ ${kode} berhasil didistribusikan!`);
      setTimeout(() => setSuccessMsg(""), 4000);

      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mendistribusikan laporan.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setLoadingKirim(null);
    }
  }

  if (loading) {
    return (
      <div className="w-full border-2 border-black bg-white p-10 text-center text-sm text-gray-400 italic">
        Memuat laporan masuk...
      </div>
    );
  }

  return (
    <>
      {/* Modal gambar */}
      {modalSrc && (
        <ImageModal
          src={modalSrc}
          onClose={() => setModalSrc(null)}
        />
      )}

      <div className="w-full border-2 border-black bg-white overflow-visible">

        {successMsg && (
          <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b border-green-200">
            {successMsg}
          </p>
        )}
        {error && (
          <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b border-red-200">
            {error}
          </p>
        )}

        {/* Header */}
        <div className="flex font-bold uppercase text-xs">
          <div className="flex-1 border-r-2 border-black p-3 text-center">
            Kritik atau Pengaduan Terkait Polibatam
          </div>
          <div className="w-80 p-3 text-center">Unit yang di tuju</div>
        </div>

        {laporan.length === 0 ? (
          <div className="flex min-h-[180px] border-t-2 border-black items-center justify-center">
            <p className="text-gray-400 italic text-sm">
              Tidak ada laporan masuk saat ini.
            </p>
          </div>
        ) : (
          laporan.map((item) => (
            <div key={item.id_laporan} className="flex min-h-[180px] border-t-2 border-black">

              {/* Kiri: Isi Laporan */}
              <div className="flex-1 border-r-2 border-black p-5 relative">
                <p className="text-[9px] text-gray-400 italic mb-1">
                  {item.kode_laporan} · {item.jenis_laporan}
                </p>

                <div className="border border-gray-400 p-4 h-28 text-xs bg-gray-50 overflow-auto">
                  {item.deskripsi}
                </div>

                {/* Tombol Lihat Gambar — buka modal saat diklik */}
                {item.lampiran && (
                  <button
                    onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran}`)}
                    className="mt-4 border border-black px-2 py-1 flex items-center gap-2 text-[10px] hover:bg-gray-100 font-bold uppercase"
                  >
                    🖼️ Lihat Gambar
                  </button>
                )}
              </div>

              {/* Kanan: Pilih Unit & Send */}
              <div className="w-80 p-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase block text-center mb-2">
                    Pilih Unit :
                  </label>

                  <select
                    className="border border-black p-2 w-full text-[11px] bg-white outline-none cursor-pointer h-[35px]"
                    value={selectedKepala[item.id_laporan] || ""}
                    onChange={(e) =>
                      setSelectedKepala((prev) => ({
                        ...prev,
                        [item.id_laporan]: Number(e.target.value),
                      }))
                    }
                  >
                    <option value="">pilih unit yang di tuju</option>
                    {kepalaList.map((k) => (
                      <option key={k.id_kepala} value={k.id_kepala}>
                        {k.unit} — {k.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => handleSend(item.id_laporan)}
                    disabled={loadingKirim === item.id_laporan}
                    className="bg-[#5da0dd] text-white px-10 py-2 font-bold shadow-md hover:bg-blue-600 transition-all uppercase text-xs tracking-widest disabled:opacity-50"
                  >
                    {loadingKirim === item.id_laporan ? "MENGIRIM..." : "SEND"}
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </>
  );
}