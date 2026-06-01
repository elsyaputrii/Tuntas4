"use client";

import { useState, useEffect } from "react";
import { stafApi } from "@/lib/api";

interface ProsesItem {
  id_laporan: number;
  kode_laporan: string;
  id_boxing: number;
  jenis_laporan: string;
  isi_laporan: string;
  status_laporan: string;
  nama_unit: string;
  status_boxing: string;
  status_review: string | null;
  aksi_masukan: string | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  hasil_tindakan: string | null;
  tanggal_pelaksanaan: string | null;
}

const reviewBadge: Record<string, { label: string; cls: string }> = {
  menunggu_keputusan_ka: { label: "⏳ Ke Ka P4M", cls: "text-blue-600 bg-blue-50" },
  ditindaklanjuti:       { label: "✓ Ditindaklanjuti", cls: "text-green-600 bg-green-50" },
  tidak_ditindaklanjuti: { label: "✗ Tidak", cls: "text-red-600 bg-red-50" },
};

const boxingBadge: Record<string, string> = {
  terdistribusi: "Terdistribusi",
  diproses: "Diproses",
  menunggu_pelaksanaan: "Menunggu hasil unit",
  di_staff: "Di Staf P4M",
  selesai: "Selesai",
};

export default function ProcessMonitorTable() {
  const [data, setData] = useState<ProsesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchData(); }, []);

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

  async function putuskan(
    id_boxing: number,
    keputusan: "selesai" | "belum" | "lanjut" | "ditindak_lanjut"
  ) {
    if (keputusan === "ditindak_lanjut") {
      const ok = confirm(
        "Laporan akan ditindaklanjuti lagi dan dikirim kembali ke Kepala Unit untuk mengisi ulang hasil tindak lanjut. Lanjutkan?"
      );
      if (!ok) return;
    }
    setError("");
    try {
      const res = await stafApi.setKeputusanBoxing(id_boxing, keputusan);
      setMsg(res.message);
      setTimeout(() => setMsg(""), 4000);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
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

  const aktif = data.filter((d) => d.status_boxing !== "selesai");
  const selesai = data.filter((d) => d.status_boxing === "selesai");

  function renderRow(item: ProsesItem) {
    const rev = item.status_review ? reviewBadge[item.status_review] : null;
    const diStaff = item.status_boxing === "di_staff";
    const isSelesai = item.status_boxing === "selesai";
    const ditindak = item.status_review === "ditindaklanjuti";
    const tidakKa = item.status_review === "tidak_ditindaklanjuti";

    return (
      <div key={`${item.id_laporan}-${item.id_boxing}`} className="flex min-w-[1100px] border-t-2 border-black">
        <div className="flex-1 border-r-2 border-black p-4">
          <p className="text-[9px] text-gray-400 mb-1">
            {item.kode_laporan} · {item.nama_unit} · {boxingBadge[item.status_boxing] || item.status_boxing}
          </p>
          <div className="border border-gray-400 p-2 h-20 text-[10px] overflow-auto">{item.isi_laporan}</div>
        </div>
        <div className="w-32 border-r-2 border-black p-4 flex flex-col gap-1 justify-center">
          {rev && (
            <span className={`text-[8px] font-bold px-1 py-0.5 border text-center ${rev.cls}`}>{rev.label}</span>
          )}
        </div>
        <div className="w-48 border-r-2 border-black p-4">
          <div className="border border-gray-300 p-2 h-20 text-[10px] overflow-auto">
            {item.hasil_tindakan || (tidakKa ? "— (tidak ditindaklanjuti)" : "Belum ada hasil")}
          </div>
        </div>
        <div className="w-44 p-4 flex flex-col gap-1.5 justify-center">
          {diStaff && (
            <>
              <button
                type="button"
                onClick={() => putuskan(item.id_boxing, "selesai")}
                className="w-full bg-green-600 text-white text-[10px] font-bold py-1.5"
              >
                ✓ Selesai
              </button>
              {ditindak && item.hasil_tindakan && (
                <button
                  type="button"
                  onClick={() => putuskan(item.id_boxing, "belum")}
                  className="w-full border border-black text-[10px] py-1"
                >
                  Belum selesai
                </button>
              )}
            </>
          )}
          {isSelesai && ditindak && (
            <button
              type="button"
              onClick={() => putuskan(item.id_boxing, "ditindak_lanjut")}
              className="w-full border border-orange-500 bg-orange-50 text-orange-800 text-[10px] font-bold py-1.5"
            >
              ↻ Ditindaklanjuti lagi
            </button>
          )}
          {isSelesai && tidakKa && (
            <button
              type="button"
              onClick={() => putuskan(item.id_boxing, "lanjut")}
              className="w-full border border-gray-500 text-[10px] py-1.5"
            >
              ↻ Buka kembali
            </button>
          )}
          {!diStaff && !isSelesai && (
            <span className="text-[9px] text-gray-400 italic text-center">Menunggu tahap sebelumnya</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
      <p className="text-[10px] text-gray-500 px-3 py-2 bg-gray-50 border-b">
        Staf P4M menentukan selesai atau belum. Laporan selesai masuk Rekapitulasi, tetapi tetap bisa Ditindaklanjuti lagi → kembali ke Kepala Unit.
      </p>
      {msg && <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b">{msg}</p>}
      {error && <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b">❌ {error}</p>}

      <div className="flex min-w-[1100px] font-bold uppercase bg-gray-50 border-b-2 border-black text-center">
        <div className="flex-1 border-r-2 border-black p-3">Laporan</div>
        <div className="w-32 border-r-2 border-black p-3">Keputusan Ka</div>
        <div className="w-48 border-r-2 border-black p-3">Hasil Unit</div>
        <div className="w-44 p-3">Keputusan Staf</div>
      </div>

      {aktif.length === 0 && selesai.length === 0 ? (
        <div className="p-8 text-center text-gray-400 italic">Belum ada laporan diproses.</div>
      ) : (
        <>
          {aktif.map(renderRow)}
          {selesai.length > 0 && (
            <>
              <div className="bg-gray-100 px-3 py-1 text-[10px] font-bold uppercase border-t-2 border-black">
                Sudah selesai (bisa dilanjutkan)
              </div>
              {selesai.map(renderRow)}
            </>
          )}
        </>
      )}
    </div>
  );
}
