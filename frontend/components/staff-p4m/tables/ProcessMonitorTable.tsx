"use client";
// FILE: frontend/components/staff-p4m/tables/ProcessMonitorTable.tsx

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
  id_rancangan:        number | null;   // ← BARU
  penyebab:            string | null;
  rencana_tindakan:    string | null;
  status_review:       string | null;
  catatan_kepala:      string | null;
  hasil_tindakan:      string | null;
  lampiran_hasil:      string | null;
  tanggal_pelaksanaan: string | null;
}

// Badge warna sesuai status_review
const reviewBadge: Record<string, { label: string; cls: string }> = {
  menunggu_review:  { label: "⏳ Menunggu Review",  cls: "text-blue-600 bg-blue-50 border-blue-200" },
  disetujui:        { label: "✓ Disetujui",          cls: "text-green-600 bg-green-50 border-green-200" },
  tidak_disetujui:  { label: "✗ Ditolak",            cls: "text-red-500 bg-red-50 border-red-200" },
  revisi:           { label: "⚠ Perlu Revisi",       cls: "text-yellow-600 bg-yellow-50 border-yellow-200" },
};

export default function ProcessMonitorTable() {
  const [data,       setData]       = useState<ProsesItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [msgStatus,  setMsgStatus]  = useState("");

  // State untuk modal review rancangan
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    id_rancangan: number | null;
    kode: string;
  }>({ open: false, id_rancangan: null, kode: "" });
  const [reviewStatus,  setReviewStatus]  = useState<"disetujui" | "tidak_disetujui" | "revisi">("disetujui");
  const [reviewCatatan, setReviewCatatan] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

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

  // Buka modal review rancangan
  function openReviewModal(id_rancangan: number, kode: string) {
    setReviewModal({ open: true, id_rancangan, kode });
    setReviewStatus("disetujui");
    setReviewCatatan("");
  }

  // Kirim review rancangan ke backend
  async function handleSubmitReview() {
    if (!reviewModal.id_rancangan) return;
    setSubmittingReview(true);
    try {
      await stafApi.reviewRancangan({
        id_rancangan: reviewModal.id_rancangan,
        status_review: reviewStatus,
        catatan: reviewCatatan,
      });
      setMsgStatus(
        reviewStatus === "disetujui"
          ? "✅ Rancangan disetujui! Kepala Unit dapat melanjutkan pelaksanaan."
          : reviewStatus === "revisi"
          ? "📝 Rancangan dikembalikan untuk direvisi."
          : "❌ Rancangan ditolak."
      );
      setTimeout(() => setMsgStatus(""), 4000);
      setReviewModal({ open: false, id_rancangan: null, kode: "" });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal submit review.");
      setTimeout(() => setError(""), 3000);
    } finally {
      setSubmittingReview(false);
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
    <>
      {/* ── MODAL REVIEW RANCANGAN ─────────────────────── */}
      {reviewModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white border-2 border-black w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-sm uppercase mb-4 border-b-2 border-black pb-2">
              Review Rancangan — {reviewModal.kode}
            </h3>

            {/* Pilih status review */}
            <div className="mb-4">
              <label className="text-[11px] font-bold uppercase block mb-2">
                Keputusan Review :
              </label>
              <div className="flex gap-2">
                {(["disetujui", "revisi", "tidak_disetujui"] as const).map((s) => {
                  const colorMap = {
                    disetujui:       "border-green-500 bg-green-50 text-green-700",
                    revisi:          "border-yellow-500 bg-yellow-50 text-yellow-700",
                    tidak_disetujui: "border-red-500 bg-red-50 text-red-700",
                  };
                  const labelMap = {
                    disetujui: "✓ Setujui",
                    revisi: "⚠ Revisi",
                    tidak_disetujui: "✗ Tolak",
                  };
                  return (
                    <button
                      key={s}
                      onClick={() => setReviewStatus(s)}
                      className={`flex-1 py-2 border-2 text-[11px] font-bold transition-all ${
                        reviewStatus === s
                          ? colorMap[s]
                          : "border-gray-200 text-gray-400 hover:border-gray-400"
                      }`}
                    >
                      {labelMap[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Catatan (wajib jika revisi/tolak) */}
            <div className="mb-4">
              <label className="text-[11px] font-bold uppercase block mb-1">
                Catatan {reviewStatus !== "disetujui" ? "(wajib)" : "(opsional)"} :
              </label>
              <textarea
                className="w-full border border-black p-2 text-xs h-24 outline-none focus:border-[#5da0dd] resize-none"
                placeholder={
                  reviewStatus === "disetujui"
                    ? "Catatan tambahan (opsional)..."
                    : "Jelaskan alasan revisi / penolakan..."
                }
                value={reviewCatatan}
                onChange={(e) => setReviewCatatan(e.target.value)}
              />
            </div>

            {/* Tombol aksi modal */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setReviewModal({ open: false, id_rancangan: null, kode: "" })}
                className="px-4 py-2 border border-black text-[11px] hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={
                  submittingReview ||
                  (reviewStatus !== "disetujui" && !reviewCatatan.trim())
                }
                className="px-6 py-2 bg-[#5da0dd] text-white text-[11px] font-bold hover:bg-blue-600 disabled:opacity-50"
              >
                {submittingReview ? "Menyimpan..." : "Kirim Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TABEL UTAMA ────────────────────────────────── */}
      <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
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

        {/* Header */}
        <div className="flex min-w-[1200px] font-bold uppercase bg-gray-50 border-b-2 border-black text-center">
          <div className="flex-1 border-r-2 border-black p-3">Kritik / Pengaduan</div>
          <div className="w-36  border-r-2 border-black p-3">Penyebab</div>
          <div className="w-48  border-r-2 border-black p-3">Rencana Tindak Lanjut</div>
          <div className="w-44  border-r-2 border-black p-3">Review Rancangan</div>
          <div className="w-64  border-r-2 border-black p-3">Hasil Tindak Lanjut</div>
          <div className="w-36  border-r-2 border-black p-3">Recapt</div>
          <div className="w-36  p-3">Export</div>
        </div>

        {data.length === 0 ? (
          <div className="flex min-w-[1200px] border-t-2 border-black p-8 justify-center">
            <p className="text-gray-400 italic">Belum ada laporan yang sedang diproses.</p>
          </div>
        ) : (
          data.map((item) => {
            const badge = item.status_review ? reviewBadge[item.status_review] : null;
            const bisaReview = item.id_rancangan && item.status_review === "menunggu_review";

            return (
              <div key={`${item.id_laporan}-${item.id_boxing}`} className="flex min-w-[1200px] border-t-2 border-black">

                {/* Kolom isi laporan */}
                <div className="flex-1 border-r-2 border-black p-4">
                  <p className="text-[9px] text-gray-400 italic mb-1">
                    {item.kode_laporan} · {item.jenis_laporan} · {item.nama_unit}
                  </p>
                  <div className="border border-gray-400 p-3 h-28 italic text-gray-500 overflow-auto text-[11px]">
                    {item.isi_laporan}
                  </div>
                </div>

                {/* Kolom penyebab */}
                <div className="w-36 border-r-2 border-black p-4">
                  <div className="border border-gray-400 p-2 h-20 italic text-gray-500 text-[10px] overflow-auto">
                    {item.penyebab || (
                      <span className="text-gray-300">Belum diisi Kepala Unit</span>
                    )}
                  </div>
                </div>

                {/* Kolom rencana */}
                <div className="w-48 border-r-2 border-black p-4">
                  <div className="border border-gray-400 p-2 h-20 italic text-gray-500 text-[10px] overflow-auto">
                    {item.rencana_tindakan || (
                      <span className="text-gray-300">Belum diisi Kepala Unit</span>
                    )}
                  </div>
                </div>

                {/* ── Kolom REVIEW RANCANGAN (BARU) ── */}
                <div className="w-44 border-r-2 border-black p-4 flex flex-col gap-2 items-center justify-start pt-5">
                  {/* Badge status */}
                  {badge && (
                    <span className={`text-[9px] font-bold px-2 py-1 border rounded w-full text-center ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}

                  {/* Catatan kepala jika ada */}
                  {item.catatan_kepala && (
                    <p className="text-[9px] text-gray-500 italic border border-gray-200 p-1 w-full">
                      📝 {item.catatan_kepala}
                    </p>
                  )}

                  {/* Tombol review — hanya muncul jika status menunggu_review */}
                  {bisaReview && (
                    <button
                      onClick={() => openReviewModal(item.id_rancangan!, item.kode_laporan)}
                      className="w-full bg-[#5da0dd] text-white text-[10px] font-bold py-1.5 px-2 hover:bg-blue-600 transition-all shadow"
                    >
                      Review Rancangan
                    </button>
                  )}

                  {/* Jika belum ada rancangan */}
                  {!item.id_rancangan && (
                    <span className="text-[9px] text-gray-400 italic text-center">
                      Menunggu rancangan dari Kepala Unit
                    </span>
                  )}
                </div>

                {/* Kolom hasil tindak lanjut */}
                <div className="w-64 border-r-2 border-black p-4 relative">
                  <div className="border border-gray-400 p-3 h-28 italic text-gray-500 text-[10px] overflow-auto">
                    {item.tanggal_pelaksanaan && (
                      <span className="block font-bold not-italic text-gray-700 mb-1">
                        {new Date(item.tanggal_pelaksanaan).toLocaleDateString("id-ID")}
                      </span>
                    )}
                    {item.hasil_tindakan || "Belum ada hasil"}
                  </div>
                </div>

                {/* Kolom Recap CLOSE/OPEN */}
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

                {/* Kolom Export */}
                <div className="w-36 p-4 flex gap-2 justify-center items-center">
                  <button className="border border-black px-3 py-1 text-[10px] hover:bg-gray-100">PDF</button>
                  <button className="border border-black px-2 py-1 text-[10px] hover:bg-gray-100">Excel</button>
                </div>

              </div>
            );
          })
        )}
      </div>
    </>
  );
}