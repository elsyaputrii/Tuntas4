"use client";
// FILE: frontend/components/ka-p4m/KaP4MReviewTable.tsx
// Tab 1 Ka-P4M: melihat rancangan dari Kepala Unit dan memberi keputusan

import { useState, useEffect, useCallback } from "react";
import { stafApi } from "@/lib/api";

interface RancanganItem {
  id_laporan:       number;
  kode_laporan:     string;
  id_boxing:        number;
  jenis_laporan:    string;
  isi_laporan:      string;
  nama_unit:        string;
  id_rancangan:     number | null;
  penyebab:         string | null;
  rencana_tindakan: string | null;
  status_review:    string | null;
  catatan_kepala:   string | null;
  hasil_tindakan:   string | null;
  tanggal_pelaksanaan: string | null;
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  menunggu_review:  { label: "⏳ Menunggu Review",   cls: "text-blue-600 bg-blue-50 border-blue-200" },
  disetujui:        { label: "✓ Disetujui",           cls: "text-green-600 bg-green-50 border-green-200" },
  tidak_disetujui:  { label: "✗ Ditolak",             cls: "text-red-500 bg-red-50 border-red-200" },
  revisi:           { label: "⚠ Perlu Revisi",        cls: "text-yellow-600 bg-yellow-50 border-yellow-200" },
};

export default function KaP4MReviewTable() {
  const [data,    setData]    = useState<RancanganItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [msgOk,   setMsgOk]   = useState("");

  // State modal review
  const [modal, setModal]           = useState<{ open: boolean; item: RancanganItem | null }>({ open: false, item: null });
  const [reviewStatus,  setReviewStatus]  = useState<"disetujui" | "tidak_disetujui" | "revisi">("disetujui");
  const [reviewCatatan, setReviewCatatan] = useState("");
  const [submitting,    setSubmitting]    = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Gunakan endpoint getProsesMonitor milik staf — Ka-P4M hanya melihat (read-only view)
      // karena Ka-P4M dan Staf P4M sama-sama butuh data rancangan
      const res = await stafApi.getProsesMonitor();
      // Filter: hanya tampilkan yang sudah ada rancangan (sudah diisi Kepala Unit)
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
    setReviewStatus("disetujui");
    setReviewCatatan("");
  }

  async function handleSubmitReview() {
    if (!modal.item?.id_rancangan) return;
    if (reviewStatus !== "disetujui" && !reviewCatatan.trim()) {
      setError("Catatan wajib diisi untuk revisi atau penolakan.");
      return;
    }
    setSubmitting(true);
    try {
      await stafApi.reviewRancangan({
        id_rancangan: modal.item.id_rancangan,
        status_review: reviewStatus,
        catatan: reviewCatatan || undefined,
      });
      setMsgOk(
        reviewStatus === "disetujui"
          ? "✅ Rancangan berhasil disetujui!"
          : reviewStatus === "revisi"
          ? "📝 Rancangan dikembalikan untuk direvisi."
          : "❌ Rancangan ditolak."
      );
      setTimeout(() => setMsgOk(""), 4000);
      setModal({ open: false, item: null });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal submit review.");
      setTimeout(() => setError(""), 3000);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full border-2 border-black bg-white p-12 text-center">
        <div className="w-6 h-6 border-4 border-[#5da0dd] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs">Memuat data rancangan...</p>
      </div>
    );
  }

  return (
    <>
      {/* ── MODAL REVIEW ───────────────────────────────── */}
      {modal.open && modal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white border-2 border-black w-full max-w-lg p-6 shadow-2xl">
            <h3 className="font-bold text-sm uppercase mb-1 border-b-2 border-black pb-2">
              Review Rancangan — {modal.item.kode_laporan}
            </h3>
            <p className="text-[11px] text-gray-500 mb-4">
              Unit: <strong>{modal.item.nama_unit}</strong>
            </p>

            {/* Ringkasan laporan */}
            <div className="bg-gray-50 border border-gray-200 p-3 mb-4 text-[11px] space-y-1">
              <p><span className="font-bold">Laporan:</span> {modal.item.isi_laporan}</p>
              <p><span className="font-bold">Penyebab:</span> {modal.item.penyebab}</p>
              <p><span className="font-bold">Rencana:</span> {modal.item.rencana_tindakan}</p>
            </div>

            {/* Pilih keputusan */}
            <label className="text-[11px] font-bold uppercase block mb-2">Keputusan :</label>
            <div className="flex gap-2 mb-4">
              {(["disetujui", "revisi", "tidak_disetujui"] as const).map((s) => {
                const colorMap = {
                  disetujui:       "border-green-500 bg-green-50 text-green-700",
                  revisi:          "border-yellow-500 bg-yellow-50 text-yellow-700",
                  tidak_disetujui: "border-red-500 bg-red-50 text-red-700",
                };
                const labelMap = {
                  disetujui:       "✓ Setujui",
                  revisi:          "⚠ Revisi",
                  tidak_disetujui: "✗ Tolak",
                };
                return (
                  <button
                    key={s}
                    onClick={() => setReviewStatus(s)}
                    className={`flex-1 py-2 border-2 text-[11px] font-bold transition-all ${
                      reviewStatus === s ? colorMap[s] : "border-gray-200 text-gray-400 hover:border-gray-400"
                    }`}
                  >
                    {labelMap[s]}
                  </button>
                );
              })}
            </div>

            {/* Catatan */}
            <label className="text-[11px] font-bold uppercase block mb-1">
              Catatan {reviewStatus !== "disetujui" ? "(wajib)" : "(opsional)"} :
            </label>
            <textarea
              className="w-full border border-black p-2 text-xs h-20 outline-none focus:border-[#5da0dd] resize-none mb-4"
              placeholder={
                reviewStatus === "disetujui"
                  ? "Catatan tambahan (opsional)..."
                  : "Jelaskan alasan revisi atau penolakan..."
              }
              value={reviewCatatan}
              onChange={(e) => setReviewCatatan(e.target.value)}
            />

            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setModal({ open: false, item: null })}
                className="px-4 py-2 border border-black text-[11px] hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submitting || (reviewStatus !== "disetujui" && !reviewCatatan.trim())}
                className="px-6 py-2 bg-[#5da0dd] text-white text-[11px] font-bold hover:bg-blue-600 disabled:opacity-50"
              >
                {submitting ? "Menyimpan..." : "Kirim Keputusan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TABEL ──────────────────────────────────────── */}
      <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
        {msgOk && (
          <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b border-green-200">{msgOk}</p>
        )}
        {error && !modal.open && (
          <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b border-red-200">❌ {error}</p>
        )}

        {/* Header */}
        <div className="flex font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[11px]">
          <div className="flex-1 border-r-2 border-black p-3">Kritik atau Pengaduan</div>
          <div className="w-[18%] border-r-2 border-black p-3">Penyebab</div>
          <div className="w-[22%] border-r-2 border-black p-3">Rencana Tindak Lanjut</div>
          <div className="w-[15%] border-r-2 border-black p-3">Pilih Tindakan</div>
          <div className="w-[20%] p-3">Aksi</div>
        </div>

        {data.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 italic text-sm">
              Belum ada rancangan dari Kepala Unit yang perlu direview.
            </p>
          </div>
        ) : (
          data.map((item, idx) => {
            const badge    = item.status_review ? statusBadge[item.status_review] : null;
            const bisaReview = item.status_review === "menunggu_review";

            return (
              <div
                key={`${item.id_boxing}-${idx}`}
                className={`flex min-h-[180px] ${idx > 0 ? "border-t-2 border-black" : ""}`}
              >
                {/* Kolom laporan */}
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
                </div>

                {/* Penyebab */}
                <div className="w-[18%] border-r-2 border-black p-5">
                  <div className="border border-gray-300 p-2 h-28 text-[11px] italic text-gray-600 overflow-auto">
                    {item.penyebab || <span className="text-gray-300">—</span>}
                  </div>
                </div>

                {/* Rencana */}
                <div className="w-[22%] border-r-2 border-black p-5">
                  <div className="border border-gray-300 p-2 h-28 text-[11px] italic text-gray-600 overflow-auto">
                    {item.rencana_tindakan || <span className="text-gray-300">—</span>}
                  </div>
                </div>

                {/* Status badge */}
                <div className="w-[15%] border-r-2 border-black p-5 flex items-start justify-center pt-6">
                  {badge ? (
                    <span className={`text-[10px] font-bold px-2 py-1 border rounded text-center ${badge.cls}`}>
                      {badge.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">—</span>
                  )}
                </div>

                {/* Aksi */}
                <div className="w-[20%] p-5 flex flex-col gap-2 justify-center items-center">
                  {bisaReview ? (
                    <button
                      onClick={() => openModal(item)}
                      className="w-full bg-[#5da0dd] text-white font-bold py-2 px-3 text-[11px] uppercase shadow hover:bg-blue-600 transition-all"
                    >
                      Beri Keputusan
                    </button>
                  ) : item.status_review === "disetujui" ? (
                    <div className="text-center">
                      <span className="text-green-600 font-bold text-[11px] block">✓ DISETUJUI</span>
                      {item.hasil_tindakan && (
                        <span className="text-[10px] text-gray-400">Ada laporan hasil</span>
                      )}
                    </div>
                  ) : item.status_review === "revisi" ? (
                    <span className="text-yellow-600 text-[10px] text-center font-semibold">
                      ⚠ Menunggu Revisi<br />Kepala Unit
                    </span>
                  ) : item.status_review === "tidak_disetujui" ? (
                    <span className="text-red-500 text-[10px] text-center font-semibold">✗ Ditolak</span>
                  ) : (
                    <span className="text-gray-400 text-[10px] italic text-center">
                      Kepala Unit belum mengisi rancangan
                    </span>
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