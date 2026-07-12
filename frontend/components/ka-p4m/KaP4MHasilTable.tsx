"use client";
// FILE: frontend/components/ka-p4m/KaP4MHasilTable.tsx
// ============================================================
// ✅ FITUR PINDAH KEWENANGAN: keputusan "diterima" (→ laporan otomatis
// Selesai) atau "ditolak" (→ balik ke Kepala Unit untuk revisi hasil)
// atas hasil tindak lanjut unit dulunya milik Staf P4M
// (ProcessMonitorTable.tsx / RecapitulationTable.tsx, endpoint
// PATCH /staf/approval-boxing). Sekarang wewenang itu HANYA ada di sini,
// di sisi Ka P4M, lewat PATCH /ka-p4m/approval-hasil. Staf P4M cuma bisa
// lihat & pantau prosesnya (read-only) di tab "Proses & Pantau" miliknya.
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { kaP4MApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

interface HasilItem {
  id_laporan: number;
  kode_laporan: string;
  id_boxing: number;
  jenis_laporan: string | null;
  isi_laporan: string | null;
  lampiran_laporan: string | null;
  nama_unit: string | null;
  status_boxing: string | null;
  status_review: string | null;
  aksi_masukan: string | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  hasil_tindakan: string | null;
  lampiran_hasil: string | null;
  tanggal_pelaksanaan: string | null;
  approval_staf: string | null;
  catatan_approval: string | null;
  created_at?: string | null;
}

export default function KaP4MHasilTable() {
  const [data, setData] = useState<HasilItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msgOk, setMsgOk] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const [modal, setModal] = useState<{
    open: boolean;
    id_boxing: number | null;
    keputusan: "diterima" | "ditolak" | null;
    catatan: string;
  }>({ open: false, id_boxing: null, keputusan: null, catatan: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await kaP4MApi.getProsesMonitor();
      // Hanya tampilkan yang sudah ada hasil pelaksanaan dari unit dan
      // sedang di tahap Staf P4M (di_staff) — inilah yang butuh keputusan.
      const filtered = (res.data as HasilItem[]).filter(
        (item) => item.status_boxing === "di_staff" && item.hasil_tindakan
      );
      setData(filtered);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function getImageUrl(lampiran: string | null): string {
    if (!lampiran) return "";
    if (lampiran.startsWith("http")) return lampiran;
    if (lampiran.startsWith("uploads/")) return `${BASE_URL}/${lampiran}`;
    return `${BASE_URL}/uploads/${lampiran}`;
  }

  function openModal(id_boxing: number, keputusan: "diterima" | "ditolak") {
    setModal({ open: true, id_boxing, keputusan, catatan: "" });
    setError("");
  }

  async function handleSubmit() {
    const { id_boxing, keputusan, catatan } = modal;
    if (!id_boxing || !keputusan) return;
    if (!catatan.trim()) {
      setError("Catatan / alasan wajib diisi!");
      return;
    }
    setSubmittingId(id_boxing);
    setError("");
    try {
      const res = await kaP4MApi.setApprovalHasil(id_boxing, keputusan, catatan.trim());
      setMsgOk(res.message);
      setTimeout(() => setMsgOk(""), 4000);
      setModal({ open: false, id_boxing: null, keputusan: null, catatan: "" });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan keputusan.");
    } finally {
      setSubmittingId(null);
    }
  }

  function formatTanggal(dateStr: string | null | undefined) {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return "-";
    }
  }

  if (loading) {
    return (
      <div className="w-full border-2 border-black bg-white p-12 text-center">
        <div className="w-6 h-6 border-4 border-[#5da0dd] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs">Memuat data hasil tindak lanjut...</p>
      </div>
    );
  }

  return (
    <>
      {selectedImage && <ImageModal src={selectedImage} onClose={() => setSelectedImage(null)} />}

      {/* ── MODAL KEPUTUSAN ── */}
      {modal.open && modal.id_boxing && modal.keputusan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-sm uppercase border-b-2 border-black pb-2 mb-3">
              {modal.keputusan === "diterima" ? "✅ Terima Hasil" : "✗ Tolak Hasil"} — Konfirmasi
            </h3>
            <p className="text-[11px] text-gray-500 mb-3">
              ID Boxing: <strong>{modal.id_boxing}</strong>
            </p>
            <div className="mb-4">
              <label className="text-[11px] font-bold uppercase block mb-1">
                Catatan / Alasan <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-black p-2 text-xs h-24 outline-none resize-none"
                placeholder={
                  modal.keputusan === "diterima"
                    ? "Tuliskan alasan menerima hasil ini..."
                    : "Tuliskan alasan menolak hasil ini (wajib untuk revisi)..."
                }
                value={modal.catatan}
                onChange={(e) => setModal((prev) => ({ ...prev, catatan: e.target.value }))}
              />
              <p className="text-[9px] text-gray-400 mt-1">* Wajib diisi</p>
              {error && <p className="text-red-500 text-[10px] font-bold mt-2">❌ {error}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setModal({ open: false, id_boxing: null, keputusan: null, catatan: "" })}
                className="px-4 py-2 border border-black text-[11px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submittingId === modal.id_boxing}
                className="px-6 py-2 bg-[#5da0dd] text-white text-[11px] font-bold disabled:opacity-50"
              >
                {submittingId === modal.id_boxing ? "Menyimpan..." : "Kirim Keputusan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
        <p className="text-[10px] text-gray-500 px-3 py-2 bg-gray-50 border-b">
          Ka P4M: ✓ terima (laporan otomatis Selesai) · ✗ tolak (balik ke Kepala Unit untuk revisi hasil).
        </p>
        {msgOk && <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b">{msgOk}</p>}
        {!modal.open && error && <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b">❌ {error}</p>}

        <div className="flex font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[10px]">
          <div className="flex-1 border-r-2 border-black p-3">Laporan</div>
          <div className="w-[20%] border-r-2 border-black p-3">Rencana / Aksi Masukan</div>
          <div className="w-[24%] border-r-2 border-black p-3">Hasil Tindak Lanjut Unit</div>
          <div className="w-[16%] p-3">Keputusan Ka P4M</div>
        </div>

        {data.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 italic text-sm">Belum ada hasil tindak lanjut yang perlu diputuskan.</p>
            <p className="text-gray-300 text-xs mt-1">(Tampil setelah Kepala Unit mengisi laporan hasil pelaksanaan)</p>
          </div>
        ) : (
          data.map((item) => (
            <div key={item.id_boxing} className="flex border-t-2 border-black">
              <div className="flex-1 border-r-2 border-black p-3">
                <p className="text-[9px] text-gray-400 mb-1 leading-tight">
                  <span className="font-bold">{item.kode_laporan}</span><br />
                  {item.nama_unit}
                </p>
                <div className="border border-gray-400 p-2 h-16 text-[10px] overflow-auto">{item.isi_laporan}</div>
                <p className="text-[9px] text-gray-400 mt-1">📅 {formatTanggal(item.created_at)}</p>
                {item.lampiran_laporan && (
                  <button
                    type="button"
                    onClick={() => setSelectedImage(getImageUrl(item.lampiran_laporan))}
                    className="mt-1 flex items-center gap-1 text-[9px] text-blue-600 hover:underline"
                  >
                    🖼️ Lihat Gambar Awal
                  </button>
                )}
              </div>

              <div className="w-[20%] border-r-2 border-black p-3">
                <div className="border border-gray-300 p-2 h-16 text-[10px] overflow-auto text-gray-600">
                  {item.aksi_masukan || item.rencana_tindakan || "—"}
                </div>
              </div>

              <div className="w-[24%] border-r-2 border-black p-3">
                <div className="border border-gray-300 p-2 h-16 text-[10px] overflow-auto">
                  {item.hasil_tindakan}
                </div>
                {item.tanggal_pelaksanaan && (
                  <p className="text-[9px] text-gray-400 mt-1">📅 {formatTanggal(item.tanggal_pelaksanaan)}</p>
                )}
                {item.lampiran_hasil && (
                  <button
                    type="button"
                    onClick={() => setSelectedImage(getImageUrl(item.lampiran_hasil))}
                    className="mt-1 flex items-center gap-1 text-[9px] text-blue-600 hover:underline"
                  >
                    🖼️ Lihat Gambar
                  </button>
                )}
              </div>

              <div className="w-[16%] p-3 flex items-center justify-center">
                {item.approval_staf && item.approval_staf !== "menunggu" ? (
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded border text-center ${
                      item.approval_staf === "diterima"
                        ? "text-green-700 bg-green-50 border-green-300"
                        : "text-red-700 bg-red-50 border-red-300"
                    }`}
                  >
                    {item.approval_staf === "diterima" ? "✓ Disetujui — Selesai" : "✗ Ditolak — Revisi Unit"}
                  </span>
                ) : (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => openModal(item.id_boxing, "diterima")}
                      title="Terima hasil — laporan otomatis Selesai"
                      className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-600 text-white text-lg font-bold flex items-center justify-center shadow"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal(item.id_boxing, "ditolak")}
                      title="Tolak — kembalikan ke unit untuk revisi hasil"
                      className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white text-lg font-bold flex items-center justify-center shadow"
                    >
                      ✗
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}