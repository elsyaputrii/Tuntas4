"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { kaP4MApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";
import { Pencil, Eye } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

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
  created_at?: string | null;
  lampiran_laporan?: string | null;
}

type FilterPeriod = "semua" | "harian" | "mingguan" | "bulanan" | "tahunan";

const statusBadge: Record<string, { label: string; cls: string }> = {
  menunggu_keputusan_ka: { label: "⏳ Menunggu Keputusan", cls: "text-blue-600 bg-blue-50 border-blue-200" },
  ditindaklanjuti:       { label: "🔄 Perbaikan Berkelanjutan", cls: "text-red-600 bg-red-50 border-red-200" },
  tidak_ditindaklanjuti: { label: "✅ Sesuai", cls: "text-green-600 bg-green-50 border-green-200" },
};

const FILTER_OPTIONS: { id: FilterPeriod; label: string; icon: string }[] = [
  { id: "harian",   label: "Harian",   icon: "📅" },
  { id: "mingguan", label: "Mingguan", icon: "🗓️" },
  { id: "bulanan",  label: "Bulanan",  icon: "📆" },
  { id: "tahunan",  label: "Tahunan",  icon: "🗃️" },
  { id: "semua",    label: "Semua",    icon: "📋" },
];

function isInPeriod(dateStr: string | null | undefined, period: FilterPeriod): boolean {
  if (period === "semua") return true;
  if (!dateStr) return false;

  const now = new Date();
  const d = new Date(dateStr);

  if (period === "harian") {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }
  if (period === "mingguan") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return d >= startOfWeek && d <= endOfWeek;
  }
  if (period === "bulanan") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (period === "tahunan") {
    return d.getFullYear() === now.getFullYear();
  }
  return true;
}

export default function KaP4MReviewTable() {
  const [data, setData] = useState<RancanganItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msgOk, setMsgOk] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("semua");

  const [modal, setModal] = useState<{ open: boolean; item: RancanganItem | null; mode: 'view' | 'edit' }>({
    open: false,
    item: null,
    mode: 'view',
  });
  const [keputusan, setKeputusan] = useState<"ditindaklanjuti" | "tidak">("ditindaklanjuti");
  const [aksiMasukan, setAksiMasukan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalSrc, setModalSrc] = useState<string | null>(null);

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

  const filteredData = useMemo(() => {
    return data.filter((item) => isInPeriod(item.created_at, filterPeriod));
  }, [data, filterPeriod]);

  function openModalView(item: RancanganItem) {
    setModal({ open: true, item, mode: 'view' });
    setKeputusan(item.status_review === "ditindaklanjuti" ? "ditindaklanjuti" : "tidak");
    setAksiMasukan(item.aksi_masukan || "");
    setError("");
  }

  function openModalEdit(item: RancanganItem) {
    setModal({ open: true, item, mode: 'edit' });
    setKeputusan(item.status_review === "ditindaklanjuti" ? "ditindaklanjuti" : "tidak");
    setAksiMasukan(item.aksi_masukan || "");
    setError("");
  }

  async function handleSubmit() {
    if (!modal.item?.id_rancangan) return;
    
    if (!aksiMasukan.trim()) {
      setError("Aksi / Masukan ke Kepala Unit wajib diisi!");
      return;
    }
    
    setSubmitting(true);
    try {
      await kaP4MApi.keputusanKa({
        id_rancangan: modal.item.id_rancangan,
        keputusan,
        aksi_masukan: aksiMasukan.trim(),
      });
      
      const label = keputusan === "ditindaklanjuti" 
        ? "🔄 Perbaikan Berkelanjutan" 
        : "✅ Sesuai";
      
      setMsgOk(`✅ Keputusan berhasil diperbarui menjadi "${label}"!`);
      setTimeout(() => setMsgOk(""), 4000);
      setModal({ open: false, item: null, mode: 'view' });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan keputusan.");
    } finally {
      setSubmitting(false);
    }
  }

  const now = new Date();
  const periodLabel: Record<FilterPeriod, string> = {
    semua:    "Semua Laporan",
    harian:   `Hari ini, ${now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`,
    mingguan: `Minggu ini (${new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 6).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })})`,
    bulanan:  `${now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`,
    tahunan:  `Tahun ${now.getFullYear()}`,
  };

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
      {/* ── IMAGE MODAL ── */}
      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)} />}

      {/* ── MODAL ── */}
      {modal.open && modal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-lg p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm uppercase mb-1 border-b-2 border-black pb-2">
              {modal.mode === 'edit' ? '✏️ Edit' : '📨 Lihat'} Keputusan — {modal.item!.kode_laporan}
            </h3>
            <p className="text-[11px] text-gray-500 mb-3">Unit: <strong>{modal.item!.nama_unit}</strong></p>

            <div className="bg-gray-50 border p-3 mb-4 text-[11px] space-y-2">
              <p><span className="font-bold">Laporan civitas:</span> {modal.item!.isi_laporan}</p>
              <p className="text-[10px] text-gray-500">
                📅 Tanggal Masuk: {modal.item!.created_at
                  ? new Date(modal.item!.created_at).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '-'}
              </p>
              {modal.item!.lampiran_laporan && (
                <button
                  onClick={() => {
                    const url = `${BASE_URL}/uploads/${modal.item!.lampiran_laporan}`;
                    setModalSrc(url);
                  }}
                  className="text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                >
                  🖼️ Lihat Gambar
                </button>
              )}
              <p><span className="font-bold">Penyebab (Kepala Unit):</span> {modal.item!.penyebab}</p>
              <p><span className="font-bold">Rencana (Kepala Unit):</span> {modal.item!.rencana_tindakan}</p>
            </div>

            {modal.mode === 'view' ? (
              // ── VIEW MODE ──
              <>
                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase block mb-1">Keputusan:</p>
                  <div className={`p-2 border rounded text-xs font-semibold inline-block ${
                    keputusan === 'ditindaklanjuti' 
                      ? 'border-red-500 bg-red-50 text-red-700' 
                      : 'border-green-500 bg-green-50 text-green-700'
                  }`}>
                    {keputusan === 'ditindaklanjuti' ? '🔄 Perbaikan Berkelanjutan' : '✅ Sesuai'}
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase block mb-1">Aksi / Masukan:</p>
                  <div className="border border-gray-300 p-2 text-xs rounded bg-gray-50 min-h-[60px]">
                    {aksiMasukan || '-'}
                  </div>
                </div>
              </>
            ) : (
              // ── EDIT MODE ──
              <>
                <label className="text-[11px] font-bold uppercase block mb-2">Keputusan :</label>
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setKeputusan("ditindaklanjuti")}
                    className={`flex-1 py-2 border-2 text-[11px] font-bold ${
                      keputusan === "ditindaklanjuti"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-gray-200 text-gray-400"
                    }`}
                  >
                    🔄 Perbaikan Berkelanjutan
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeputusan("tidak")}
                    className={`flex-1 py-2 border-2 text-[11px] font-bold ${
                      keputusan === "tidak"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 text-gray-400"
                    }`}
                  >
                    ✅ Sesuai
                  </button>
                </div>

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
              </>
            )}

            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setModal({ open: false, item: null, mode: 'view' })}
                className="px-4 py-2 border border-black text-[11px]"
              >
                Tutup
              </button>
              {modal.mode === 'edit' && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2 bg-[#5da0dd] text-white text-[11px] font-bold disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Update Keputusan"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER BAR ── */}
      <div className="mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilterPeriod(opt.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all
                ${filterPeriod === opt.id
                  ? "bg-[#4E617A] text-white border-[#4E617A] shadow"
                  : "bg-white text-[#4E617A] border-[#4E617A]/30 hover:bg-[#4E617A]/10"
                }`}
            >
              <span>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-gray-500 italic">
          Menampilkan: <span className="font-semibold text-[#4E617A]">{periodLabel[filterPeriod]}</span>
          <span className="ml-2 bg-[#4E617A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {filteredData.length} laporan
          </span>
        </p>
      </div>

      {/* ── TABEL ── */}
      <div className="w-full border-2 border-black bg-white text-xs">
        {msgOk && (
          <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b">{msgOk}</p>
        )}
        {error && !modal.open && (
          <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b">❌ {error}</p>
        )}

        {/* HEADER DESKTOP */}
        <div className="hidden sm:flex font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[11px]">
          <div className="flex-1 border-r-2 border-black p-3">Laporan Civitas</div>
          <div className="w-[14%] border-r-2 border-black p-3">Tanggal Masuk</div>
          <div className="w-[16%] border-r-2 border-black p-3">Penyebab</div>
          <div className="w-[20%] border-r-2 border-black p-3">Rencana Unit</div>
          <div className="w-[12%] border-r-2 border-black p-3">Status</div>
          <div className="w-[16%] p-3">Aksi</div>
        </div>

        {filteredData.length === 0 ? (
          <div className="p-12 text-center text-gray-400 italic text-sm">
            {filterPeriod === "semua"
              ? "Belum ada rancangan dari Kepala Unit."
              : `Tidak ada laporan untuk periode ${FILTER_OPTIONS.find(o => o.id === filterPeriod)?.label.toLowerCase()}.`}
          </div>
        ) : (
          filteredData.map((item, idx) => {
            const badge = item.status_review ? statusBadge[item.status_review] : null;
            const bisaPutus = item.status_review === "menunggu_keputusan_ka";
            const sudahDiputus = item.status_review === "ditindaklanjuti" || item.status_review === "tidak_ditindaklanjuti";

            return (
              <div
                key={`${item.id_boxing}-${idx}`}
                className={`${idx > 0 ? "border-t-2 border-black" : ""}`}
              >
                {/* MOBILE CARD */}
                <div className="sm:hidden p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-[#4E617A] bg-blue-50 px-2 py-0.5 rounded">
                      {item.kode_laporan} · {item.nama_unit}
                    </span>
                    {badge && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 border rounded ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Laporan Civitas</p>
                    <div className="border border-gray-300 p-2 text-[11px] rounded">{item.isi_laporan}</div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      📅 Tanggal Masuk: {item.created_at
                        ? new Date(item.created_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })
                        : '-'}
                    </p>
                    {item.lampiran_laporan && (
                      <button
                        onClick={() => {
                          const url = `${BASE_URL}/uploads/${item.lampiran_laporan}`;
                          setModalSrc(url);
                        }}
                        className="mt-1 text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                      >
                        🖼️ Lihat Gambar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Penyebab</p>
                      <div className="border border-gray-300 p-2 text-[10px] rounded min-h-[60px]">
                        {item.penyebab || "—"}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rencana Unit</p>
                      <div className="border border-gray-300 p-2 text-[10px] rounded min-h-[60px]">
                        {item.rencana_tindakan || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {bisaPutus ? (
                      <button
                        type="button"
                        onClick={() => openModalEdit(item)}
                        className="flex-1 bg-[#5da0dd] text-white font-bold py-2 text-[10px] rounded"
                      >
                        Beri Keputusan
                      </button>
                    ) : sudahDiputus ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openModalView(item)}
                          className="flex-1 bg-blue-500 text-white font-bold py-2 text-[10px] rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                        >
                          <Eye size={14} /> Lihat
                        </button>
                        <button
                          type="button"
                          onClick={() => openModalEdit(item)}
                          className="p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                          title="Edit Keputusan"
                        >
                          <Pencil size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-400 text-center w-full">Sudah diputuskan</span>
                    )}
                  </div>
                </div>

                {/* DESKTOP ROW */}
                <div className="hidden sm:flex min-h-[160px]">
                  {/* Kolom 1: Laporan Civitas */}
                  <div className="flex-1 border-r-2 border-black p-4">
                    <p className="text-[10px] text-gray-400 mb-1">
                      {item.kode_laporan} · {item.nama_unit}
                    </p>
                    <div className="border border-gray-300 p-2 h-24 text-[11px] overflow-auto">
                      {item.isi_laporan}
                    </div>
                    {item.lampiran_laporan && (
                      <button
                        onClick={() => {
                          const url = `${BASE_URL}/uploads/${item.lampiran_laporan}`;
                          setModalSrc(url);
                        }}
                        className="mt-1 text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                      >
                        🖼️ Lihat Gambar
                      </button>
                    )}
                  </div>

                  {/* Kolom 2: Tanggal Masuk */}
                  <div className="w-[14%] border-r-2 border-black p-4 flex items-center justify-center">
                    <span className="text-xs text-gray-700">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })
                        : '-'}
                    </span>
                  </div>

                  {/* Kolom 3: Penyebab */}
                  <div className="w-[16%] border-r-2 border-black p-4">
                    <div className="border border-gray-300 p-2 h-20 text-[10px] overflow-auto">
                      {item.penyebab || "—"}
                    </div>
                  </div>

                  {/* Kolom 4: Rencana Unit */}
                  <div className="w-[20%] border-r-2 border-black p-4">
                    <div className="border border-gray-300 p-2 h-20 text-[10px] overflow-auto">
                      {item.rencana_tindakan || "—"}
                    </div>
                  </div>

                  {/* Kolom 5: Status */}
                  <div className="w-[12%] border-r-2 border-black p-4 flex items-center justify-center">
                    {badge && (
                      <span className={`text-[9px] font-bold px-1 py-1 border rounded text-center ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>

                  {/* Kolom 6: Aksi */}
                  <div className="w-[16%] p-4 flex flex-col items-center justify-center gap-1">
                    {bisaPutus ? (
                      <button
                        type="button"
                        onClick={() => openModalEdit(item)}
                        className="w-full bg-[#5da0dd] text-white font-bold py-2 text-[10px] rounded hover:bg-blue-600 transition-colors"
                      >
                        Beri Keputusan
                      </button>
                    ) : sudahDiputus ? (
                      <div className="flex items-center gap-1 w-full">
                        <button
                          type="button"
                          onClick={() => openModalView(item)}
                          className="flex-1 bg-blue-500 text-white font-bold py-1.5 text-[10px] rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                        >
                          <Eye size={14} /> Lihat
                        </button>
                        <button
                          type="button"
                          onClick={() => openModalEdit(item)}
                          className="p-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                          title="Edit Keputusan"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 text-center">Sudah diputuskan</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}