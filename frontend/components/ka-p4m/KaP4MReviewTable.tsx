"use client";

import { useState, useEffect, useCallback } from "react";
import { kaP4MApi } from "@/lib/api";

interface RancanganItem {
  id_laporan: number;
  kode_laporan: string;
  id_boxing: number;
  jenis_laporan: string;
  isi_laporan: string;
  nama_unit: string;
  id_rancangan: number | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  status_review: string | null;
  aksi_masukan: string | null;
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  menunggu_keputusan_ka: { label: "⏳ Menunggu Keputusan", cls: "text-blue-600 bg-blue-50 border-blue-200" },
  ditindaklanjuti:       { label: "✓ Ditindaklanjuti",     cls: "text-green-600 bg-green-50 border-green-200" },
  tidak_ditindaklanjuti: { label: "✗ Tidak Ditindaklanjuti", cls: "text-red-500 bg-red-50 border-red-200" },
};

export default function KaP4MReviewTable() {
  const [data, setData] = useState<RancanganItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msgOk, setMsgOk] = useState("");

  const [modal, setModal] = useState<{ open: boolean; item: RancanganItem | null }>({
    open: false,
    item: null,
  });
  const [keputusan, setKeputusan] = useState<"ditindaklanjuti" | "tidak">("ditindaklanjuti");
  const [aksiMasukan, setAksiMasukan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await kaP4MApi.getProsesMonitor();
      const filtered = (res.data as RancanganItem[]).filter(
        (item) => item.id_rancangan !== null
      );
      setData(filtered);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openModal(item: RancanganItem) {
    setModal({ open: true, item });
    setKeputusan("ditindaklanjuti");
    setAksiMasukan("");
    setError("");
  }

  async function handleSubmit() {
    if (!modal.item?.id_rancangan) return;
    if (keputusan === "ditindaklanjuti" && !aksiMasukan.trim()) {
      setError("Aksi masukan wajib diisi jika ditindaklanjuti.");
      return;
    }
    setSubmitting(true);
    try {
      await kaP4MApi.keputusanKa({
        id_rancangan: modal.item.id_rancangan,
        keputusan,
        aksi_masukan: keputusan === "ditindaklanjuti" ? aksiMasukan.trim() : undefined,
      });
      setMsgOk(
        keputusan === "ditindaklanjuti"
          ? "✅ Ditindaklanjuti — masukan terkirim ke Kepala Unit."
          : "📋 Tidak ditindaklanjuti — laporan ke Staf P4M."
      );
      setTimeout(() => setMsgOk(""), 4000);
      setModal({ open: false, item: null });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan keputusan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full border-2 border-black bg-white p-12 text-center">
        <div className="w-6 h-6 border-4 border-[#5da0dd] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs">Memuat data...</p>
      </div>
    );
  }

  return (
    <>
      {modal.open && modal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm uppercase mb-1 border-b-2 border-black pb-2">
              Keputusan Ka P4M — {modal.item.kode_laporan}
            </h3>
            <p className="text-[11px] text-gray-500 mb-3">Unit: <strong>{modal.item.nama_unit}</strong></p>

            <div className="bg-gray-50 border p-3 mb-4 text-[11px] space-y-2">
              <p><span className="font-bold">Laporan civitas:</span> {modal.item.isi_laporan}</p>
              <p><span className="font-bold">Penyebab (Kepala Unit):</span> {modal.item.penyebab}</p>
              <p><span className="font-bold">Rencana (Kepala Unit):</span> {modal.item.rencana_tindakan}</p>
            </div>

            <label className="text-[11px] font-bold uppercase block mb-2">Keputusan :</label>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setKeputusan("ditindaklanjuti")}
                className={`flex-1 py-2 border-2 text-[11px] font-bold ${
                  keputusan === "ditindaklanjuti"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-400"
                }`}
              >
                ✓ Ditindaklanjuti
              </button>
              <button
                type="button"
                onClick={() => setKeputusan("tidak")}
                className={`flex-1 py-2 border-2 text-[11px] font-bold ${
                  keputusan === "tidak"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 text-gray-400"
                }`}
              >
                ✗ Tidak
              </button>
            </div>

            {keputusan === "ditindaklanjuti" && (
              <div className="mb-4">
                <label className="text-[11px] font-bold uppercase block mb-1">
                  Aksi / Masukan ke Kepala Unit (wajib) :
                </label>
                <textarea
                  className="w-full border border-black p-2 text-xs h-24 outline-none resize-none"
                  placeholder="Instruksi tindak lanjut untuk kepala unit..."
                  value={aksiMasukan}
                  onChange={(e) => setAksiMasukan(e.target.value)}
                />
              </div>
            )}

            {keputusan === "tidak" && (
              <p className="text-[11px] text-gray-500 mb-4 italic">
                Laporan langsung ke Staf P4M tanpa isian hasil dari Kepala Unit.
              </p>
            )}

            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setModal({ open: false, item: null })}
                className="px-4 py-2 border border-black text-[11px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-[#5da0dd] text-white text-[11px] font-bold disabled:opacity-50"
              >
                {submitting ? "Menyimpan..." : "Kirim Keputusan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
        {msgOk && (
          <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b">{msgOk}</p>
        )}
        {error && !modal.open && (
          <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b">❌ {error}</p>
        )}

        <div className="flex font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[11px]">
          <div className="flex-1 border-r-2 border-black p-3">Laporan Civitas</div>
          <div className="w-[16%] border-r-2 border-black p-3">Penyebab</div>
          <div className="w-[20%] border-r-2 border-black p-3">Rencana Unit</div>
          <div className="w-[14%] border-r-2 border-black p-3">Status</div>
          <div className="w-[18%] p-3">Aksi</div>
        </div>

        {data.length === 0 ? (
          <div className="p-12 text-center text-gray-400 italic text-sm">
            Belum ada rancangan dari Kepala Unit.
          </div>
        ) : (
          data.map((item, idx) => {
            const badge = item.status_review ? statusBadge[item.status_review] : null;
            const bisaPutus = item.status_review === "menunggu_keputusan_ka";

            return (
              <div
                key={`${item.id_boxing}-${idx}`}
                className={`flex min-h-[160px] ${idx > 0 ? "border-t-2 border-black" : ""}`}
              >
                <div className="flex-1 border-r-2 border-black p-4">
                  <p className="text-[10px] text-gray-400 mb-1">
                    {item.kode_laporan} · {item.nama_unit}
                  </p>
                  <div className="border border-gray-300 p-2 h-24 text-[11px] overflow-auto">
                    {item.isi_laporan}
                  </div>
                </div>
                <div className="w-[16%] border-r-2 border-black p-4">
                  <div className="border border-gray-300 p-2 h-20 text-[10px] overflow-auto">
                    {item.penyebab || "—"}
                  </div>
                </div>
                <div className="w-[20%] border-r-2 border-black p-4">
                  <div className="border border-gray-300 p-2 h-20 text-[10px] overflow-auto">
                    {item.rencana_tindakan || "—"}
                  </div>
                </div>
                <div className="w-[14%] border-r-2 border-black p-4 flex items-start justify-center pt-4">
                  {badge && (
                    <span className={`text-[9px] font-bold px-1 py-1 border rounded text-center ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                <div className="w-[18%] p-4 flex flex-col justify-center gap-2">
                  {bisaPutus ? (
                    <button
                      type="button"
                      onClick={() => openModal(item)}
                      className="w-full bg-[#5da0dd] text-white font-bold py-2 text-[10px]"
                    >
                      Beri Keputusan
                    </button>
                  ) : item.aksi_masukan ? (
                    <p className="text-[9px] text-gray-600 italic border p-1">
                      📨 {item.aksi_masukan}
                    </p>
                  ) : (
                    <span className="text-[10px] text-gray-400 text-center">Sudah diputuskan</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
