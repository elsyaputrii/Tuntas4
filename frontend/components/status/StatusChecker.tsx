"use client";

import { useState, useEffect } from "react";
import { civitasApi } from "@/lib/api";

const UPLOADS_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

export interface TahapProgres {
  id: string;
  title: string;
  selesai: boolean;
  deskripsi: string;
}

export interface StatusLaporanData {
  kode_laporan: string;
  status_pelapor_label: string;
  jenis_laporan_label: string;
  deskripsi: string;
  lampiran: string | null;
  status: string;
  status_label: string;
  created_at: string;
  unit_tujuan: string[];
  rencana_tindakan: string | null;
  catatan_staf: string | null;
  tahap_progres: TahapProgres[];
  update_terbaru: string;
}

interface StatusCheckerProps {
  initialKode?: string;
}

const statusBadgeClass: Record<string, string> = {
  menunggu: "bg-yellow-100 text-yellow-800 border-yellow-300",
  diproses: "bg-blue-100 text-blue-800 border-blue-300",
  selesai: "bg-green-100 text-green-800 border-green-300",
  ditolak: "bg-red-100 text-red-800 border-red-300",
};

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StatusChecker({ initialKode = "" }: StatusCheckerProps) {
  const [ticket, setTicket] = useState(initialKode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<StatusLaporanData | null>(null);
  const [previewImage, setPreviewImage] = useState(false);

  useEffect(() => {
    if (initialKode) {
      setTicket(initialKode);
      void cariStatus(initialKode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKode]);

  async function cariStatus(kodeInput?: string) {
    const kode = (kodeInput ?? ticket).trim();
    if (!kode) {
      setError("Masukkan nomor tiket laporan.");
      return;
    }

    setError("");
    setData(null);

    try {
      setLoading(true);
      const res = await civitasApi.cekStatus(kode);
      setData(res.data as StatusLaporanData);
      setTicket(res.data.kode_laporan);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Laporan tidak ditemukan.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void cariStatus();
  }

  const lampiranUrl = data?.lampiran
    ? `${UPLOADS_BASE}/uploads/${data.lampiran}`
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl overflow-hidden relative">
        <div className="relative z-10">
          <span className="bg-white/20 px-4 py-2 rounded-full text-sm font-medium">
            Tracking Laporan
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mt-4 leading-tight">
            Cek Status Laporan Anda
          </h1>
          <p className="text-blue-100 mt-3 max-w-2xl">
            Masukkan nomor tiket (format LAP-00001) untuk melihat perkembangan laporan.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full" />
      </div>

      {/* Form pencarian */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Nomor Tiket
            </label>
            <input
              type="text"
              placeholder="Contoh: LAP-00001"
              value={ticket}
              onChange={(e) => setTicket(e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition uppercase tracking-wider"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-fit bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? "Mencari..." : "Cari Status"}
          </button>
        </form>
      </div>

      {/* Hasil */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
          {/* Detail laporan */}
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl">
                📄
              </div>
              <div>
                <h2 className="font-bold text-xl text-gray-800">Detail Laporan</h2>
                <p className="text-gray-500 text-sm">Informasi laporan anonim Anda</p>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b pb-3 gap-4">
                <span className="text-gray-500 shrink-0">Nomor Tiket</span>
                <span className="font-bold text-gray-800 tracking-wider">{data.kode_laporan}</span>
              </div>
              <div className="flex justify-between border-b pb-3 gap-4">
                <span className="text-gray-500 shrink-0">Tanggal Laporan</span>
                <span className="font-semibold text-gray-800 text-right">
                  {formatTanggal(data.created_at)}
                </span>
              </div>
              <div className="flex justify-between border-b pb-3 gap-4">
                <span className="text-gray-500 shrink-0">Status Pelapor</span>
                <span className="font-semibold text-gray-800">{data.status_pelapor_label}</span>
              </div>
              <div className="flex justify-between border-b pb-3 gap-4">
                <span className="text-gray-500 shrink-0">Jenis Laporan</span>
                <span className="font-semibold text-gray-800">{data.jenis_laporan_label}</span>
              </div>
              <div className="flex justify-between border-b pb-3 gap-4 items-center">
                <span className="text-gray-500 shrink-0">Status Saat Ini</span>
                <span
                  className={`font-bold px-3 py-1 rounded-full border text-xs uppercase ${
                    statusBadgeClass[data.status] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {data.status_label}
                </span>
              </div>
              {data.unit_tujuan.length > 0 && (
                <div className="flex justify-between border-b pb-3 gap-4">
                  <span className="text-gray-500 shrink-0">Unit Tujuan</span>
                  <span className="font-semibold text-gray-800 text-right text-xs leading-relaxed">
                    {data.unit_tujuan.join(", ")}
                  </span>
                </div>
              )}
              <div>
                <p className="text-gray-500 mb-2">Isi Laporan</p>
                <div className="bg-gray-50 rounded-2xl p-4 text-gray-700 leading-relaxed">
                  {data.deskripsi}
                </div>
              </div>
              {data.rencana_tindakan && (
                <div>
                  <p className="text-gray-500 mb-2">Rencana Tindak Lanjut</p>
                  <div className="bg-blue-50 rounded-2xl p-4 text-gray-700 text-sm">
                    {data.rencana_tindakan}
                  </div>
                </div>
              )}
              {data.catatan_staf && (
                <div>
                  <p className="text-gray-500 mb-2">Catatan P4M</p>
                  <div className="bg-yellow-50 rounded-2xl p-4 text-gray-700 text-sm">
                    {data.catatan_staf}
                  </div>
                </div>
              )}
              {lampiranUrl && (
                <div>
                  <p className="text-gray-500 mb-3">Bukti Lampiran</p>
                  <button
                    type="button"
                    onClick={() => setPreviewImage(true)}
                    className="text-blue-600 text-sm font-semibold hover:underline"
                  >
                    Lihat lampiran
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-2xl">
                🚀
              </div>
              <div>
                <h2 className="font-bold text-xl text-gray-800">Progress Laporan</h2>
                <p className="text-gray-500 text-sm">Pantau proses laporan Anda</p>
              </div>
            </div>

            <div className="space-y-6">
              {data.tahap_progres.map((item, index) => (
                <div key={item.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        item.selesai ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      {item.selesai ? "✓" : ""}
                    </div>
                    {index < data.tahap_progres.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 min-h-[40px] mt-1 ${
                          item.selesai ? "bg-green-300" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                  <div className="pb-2">
                    <h3
                      className={`font-semibold ${
                        item.selesai ? "text-gray-800" : "text-gray-400"
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.deskripsi}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-xl">ℹ️</span>
                <div>
                  <h4 className="font-bold text-blue-700 mb-1">Update Terbaru</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{data.update_terbaru}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal lampiran */}
      {previewImage && lampiranUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lampiranUrl}
              alt="Bukti laporan"
              className="rounded-2xl max-h-[85vh] object-contain mx-auto"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(false)}
              className="absolute -top-2 -right-2 bg-white text-black rounded-full w-10 h-10 shadow-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
