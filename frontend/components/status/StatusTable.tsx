"use client";
import { useState } from "react";
import { civitasApi } from "@/lib/api";

// Tipe data yang dikembalikan API cekStatus
interface DataLaporan {
  id_laporan:       number;
  kode_laporan:     string;
  status_pelapor:   string;
  jenis_laporan:    string;
  deskripsi:        string;
  lampiran:         string | null;
  status:           string;
  catatan_staf:     string | null;
  rencana_tindakan: string | null;
  status_rancangan: string | null;
}

export default function StatusTable() {
  const [kode, setKode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [data, setData]       = useState<DataLaporan | null>(null);

  // Warna teks sesuai status laporan
  const statusColor: Record<string, string> = {
    menunggu: "text-yellow-600",
    diproses: "text-blue-600",
    selesai:  "text-green-600",
    ditolak:  "text-red-600",
  };

  // Panggil API untuk cek status
  async function handleCek() {
    if (!kode.trim()) {
      setError("Masukkan kode laporan terlebih dahulu!");
      return;
    }
    setError("");
    setData(null);
    try {
      setLoading(true);
      const res = await civitasApi.cekStatus(kode.trim().toUpperCase());
      setData(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Laporan tidak ditemukan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full border-2 border-black bg-white transition-all animate-in slide-in-from-bottom-2 duration-500">

      {/* ── INPUT PENCARIAN KODE LAPORAN ──────────────────── */}
      {/* Ditambah di atas tabel agar civitas bisa cari by kode */}
      <div className="flex gap-2 p-4 border-b-2 border-black bg-gray-50">
        <input
          type="text"
          placeholder="Masukkan kode laporan (contoh: LAP-00001)"
          className="border border-gray-300 p-2 flex-1 text-sm outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          value={kode}
          onChange={(e) => setKode(e.target.value)}
          // Tekan Enter juga bisa cari
          onKeyDown={(e) => e.key === "Enter" && handleCek()}
        />
        <button
          onClick={handleCek}
          disabled={loading}
          className="bg-[#5da0dd] text-white px-5 py-2 font-bold text-sm hover:bg-blue-600 transition-all disabled:opacity-50"
        >
          {loading ? "Mencari..." : "Cek Status"}
        </button>
      </div>

      {/* Tampil pesan error kalau kode salah / tidak ditemukan */}
      {error && (
        <p className="text-red-500 text-sm px-4 py-2 italic">{error}</p>
      )}

      {/* ── HEADER TABEL ─────────────────────────────────── */}
      {/* Sama persis dengan yang kamu buat */}
      <div className="flex font-bold text-[11px] uppercase bg-gray-50 border-b-2 border-black">
        <div className="w-[75%] border-r-2 border-black p-3 text-center">
          masukan kritik / saran
        </div>
        <div className="w-[25%] p-3 text-center">
          Status
        </div>
      </div>

      {/* ── ISI TABEL ────────────────────────────────────── */}

      {/* Kalau belum ada pencarian */}
      {!data && !error && (
        <div className="flex min-h-40 items-center justify-center">
          <p className="text-gray-400 italic text-sm">Belum ada riwayat pengajuan.</p>
        </div>
      )}

      {/* Kalau sudah ada hasil pencarian */}
      {data && (
        <div className="flex min-h-[180px] border-b-2 last:border-b-0 border-black">

          {/* KOLOM KIRI: isi laporan */}
          <div className="w-[75%] border-r-2 border-black p-5 relative bg-white">
            <div className="w-full h-36 border border-black p-4 bg-white">

              {/* Info kode + kategori laporan */}
              <p className="text-[10px] text-gray-400 mb-1 italic">
                {data.kode_laporan} · {data.jenis_laporan} · {data.status_pelapor}
              </p>

              {/* Isi deskripsi laporan */}
              <p className="font-bold text-sm text-black">{data.deskripsi}</p>

              {/* Catatan dari staf P4M — hanya muncul kalau sudah ada */}
              {data.catatan_staf && (
                <p className="text-[10px] text-gray-500 mt-2">
                  📝 Catatan staf: {data.catatan_staf}
                </p>
              )}

              {/* Rencana tindakan — hanya muncul kalau sudah diproses */}
              {data.rencana_tindakan && (
                <p className="text-[10px] text-gray-500 mt-1">
                  🔧 Rencana: {data.rencana_tindakan}
                </p>
              )}
            </div>

            {/* Tombol lihat lampiran — hanya muncul kalau ada file */}
            {data.lampiran && (
              <button className="absolute bottom-10 left-10 border border-black px-2 py-1 flex items-center gap-2 text-[10px] bg-gray-50 hover:bg-gray-100 transition-colors">
                <span>🖼️</span> Lihat Dokumen Pendukung
              </button>
            )}
          </div>

          {/* KOLOM KANAN: status dengan warna */}
          <div className="w-[25%] flex items-start justify-center p-5 bg-white">
            <div className={`border border-black p-3 text-center text-[10px] leading-tight font-bold uppercase w-full mt-2 shadow-sm ${statusColor[data.status] || ""}`}>
              {data.status}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}