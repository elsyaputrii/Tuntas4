"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { kaP4MApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import { Pencil, Eye, Clock, RefreshCw, CheckCircle2, Calendar, XCircle, Image as ImageIcon, Mail, Target,
} from "lucide-react";
import { PeriodFilterBar, isInPeriodFilter, type FilterMode,
} from "@/components/shared/PeriodFilterBar";

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
  tanggal_rencana: string | null;
  status_review: string | null;
  aksi_masukan: string | null;
  created_at?: string | null;
  lampiran_laporan?: string | null;
}

type FilterPeriod = "semua" | "harian" | "mingguan" | "bulanan" | "tahunan";

const statusBadge: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
  menunggu_keputusan_ka: {
    label: "Menunggu Keputusan",
    cls: "text-blue-600 bg-blue-50 border-blue-200",
    Icon: Clock,
  },
  ditindaklanjuti: {
    label: "Perbaikan Berkelanjutan",
    cls: "text-red-600 bg-red-50 border-red-200",
    Icon: RefreshCw,
  },
  tidak_ditindaklanjuti: {
    label: "Sesuai",
    cls: "text-green-600 bg-green-50 border-green-200",
    Icon: CheckCircle2,
  },
};



/**
 * ✅ HELPER BARU: pecah string rencana jadi array item list.
 * Backend menyimpan rencana_tindakan sebagai string gabungan, contoh:
 *   "1. datangin unhan (14/09/2026); 2. datang ke bogor (23/09/2026); 3. jdi mantu bunda kafka (25/09/2026)"
 * Fungsi ini memecah berdasarkan ';' (dan newline) lalu membersihkan
 * prefix numbering lama (1. 2. 3. atau 1) 2) dst) supaya kita bisa
 * render ulang dengan format list vertikal yang rapi.
 */
function parseRencana(rencana: string | null | undefined): string[] {
  if (!rencana) return [];

  // Pisah berdasarkan ';' atau newline, lalu buang item kosong
  const raw = rencana
    .split(/;|\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Buang prefix numbering lama (contoh: "1.", "2)", "1 -", dll)
  const cleaned = raw.map((s) =>
    s.replace(/^\s*\d+\s*[\.\)\-:]\s*/, "").trim()
  ).filter(Boolean);

  // Kalau ternyata cuma ada 1 item (tidak ada pemisah), balikkan apa adanya
  return cleaned.length > 0 ? cleaned : [rencana.trim()];
}

/**
 * ✅ KOMPONEN BARU: render list rencana vertikal dengan numbering.
 * Dipakai di mobile card, desktop grid, dan modal supaya konsisten.
 */
function RencanaList({
  rencana,
  emptyText = "—",
  textClass = "text-[10px]",
}: {
  rencana: string | null | undefined;
  emptyText?: string;
  textClass?: string;
}) {
  const items = parseRencana(rencana);

  if (items.length === 0) {
    return (
      <div className={`border border-black p-2 min-h-15 ${textClass} text-gray-400`}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className={`border border-black p-2 min-h-15 ${textClass}`}>
      <ol className="list-decimal list-inside space-y-1">
        {items.map((item, i) => (
          <li key={i} className="whitespace-pre-wrap break-words leading-snug">
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function KaP4MReviewTable() {
  const [data, setData] = useState<RancanganItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msgOk, setMsgOk] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("semua");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const filterModeLabel: Record<FilterMode, string> = {
  semua: "semua waktu",
  harian: "harian",
  mingguan: "mingguan",
  bulanan: "bulanan",
  tahunan: "tahunan",
};

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
  return data.filter((item) =>
    isInPeriodFilter(
      filterMode,
      selectedDate,
      (value) => new Date(value),
      item.created_at
    )
  );
}, [data, filterMode, selectedDate]);

const highlightedDates = useMemo(() => {
  const filterModeLabel: Record<FilterMode, string> = {
  semua: "semua waktu",
  harian: "harian",
  mingguan: "mingguan",
  bulanan: "bulanan",
  tahunan: "tahunan",
};

  const dates = new Set<string>();
    data.forEach((item) => {
      if (!item.created_at) return;

      const d = new Date(item.created_at);

      const key = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");

      dates.add(key);
    });

    return dates;
  }, [data]);

  const groupedData = useMemo(() => {
    const map = new Map<number, {
      id_laporan: number;
      kode_laporan: string;
      isi_laporan: string;
      lampiran_laporan?: string | null;
      units: RancanganItem[];
    }>();
    const order: number[] = [];
    filteredData.forEach((item) => {
      if (!map.has(item.id_laporan)) {
        map.set(item.id_laporan, {
          id_laporan: item.id_laporan,
          kode_laporan: item.kode_laporan,
          isi_laporan: item.isi_laporan,
          lampiran_laporan: item.lampiran_laporan,
          units: [],
        });
        order.push(item.id_laporan);
      }
      map.get(item.id_laporan)!.units.push(item);
    });
    return order.map((id) => map.get(id)!);
  }, [filteredData]);

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
        ? "Perbaikan Berkelanjutan"
        : "Sesuai";

      setMsgOk(`Keputusan berhasil diperbarui menjadi "${label}"!`);
      setTimeout(() => setMsgOk(""), 4000);
      setModal({ open: false, item: null, mode: 'view' });
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
        <div className="w-6 h-6 border-4 border-blue-polibatam border-t-transparent rounded-full animate-spin mx-auto mb-3" />
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
            <h3 className="font-bold text-sm uppercase mb-1 border-b-2 border-black pb-2 flex items-center gap-2">
              {modal.mode === 'edit' ? (
                <>
                  <Pencil size={16} /> Edit Keputusan — {modal.item!.kode_laporan}
                </>
              ) : (
                <>
                  <Mail size={16} /> Lihat Keputusan — {modal.item!.kode_laporan}
                </>
              )}
            </h3>
            <p className="text-[11px] text-gray-500 mb-3">Unit: <strong>{modal.item!.nama_unit}</strong></p>

            <div className="bg-gray-50 border p-3 mb-4 text-[11px] space-y-2">
              <p><span className="font-bold">Laporan civitas:</span> {modal.item!.isi_laporan}</p>
              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                <Calendar size={12} />
                Tanggal Masuk: {modal.item!.created_at
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
                  <ImageIcon size={12} /> Lihat Gambar
                </button>
              )}
              <p><span className="font-bold">Penyebab (Kepala Unit):</span> {modal.item!.penyebab}</p>

              {/* ✅ Rencana Unit tampil sebagai list vertikal */}
              <div>
                <p className="font-bold mb-1">Rencana (Kepala Unit):</p>
                <RencanaList
                  rencana={modal.item!.rencana_tindakan}
                  textClass="text-[11px]"
                  emptyText="Belum ada rencana"
                />
              </div>

              <p className="flex items-center gap-1">
                <Target size={12} className="text-gray-600 shrink-0" />
                <span className="font-bold">Target Selesai (Tanggal Rencana):</span>{" "}
                {modal.item!.tanggal_rencana
                  ? new Date(modal.item!.tanggal_rencana).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '-'}
              </p>
            </div>

            {modal.mode === 'view' ? (
              <>
                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase block mb-1">Keputusan:</p>
                  <div className={`p-2 border rounded text-xs font-semibold inline-flex items-center gap-1.5 ${
                    keputusan === 'ditindaklanjuti'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-green-500 bg-green-50 text-green-700'
                  }`}>
                    {keputusan === 'ditindaklanjuti' ? (
                      <>
                        <RefreshCw size={14} /> Perbaikan Berkelanjutan
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} /> Sesuai
                      </>
                    )}
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase block mb-1">Aksi / Masukan:</p>
                  <div className="border border-black p-2 text-xs rounded bg-gray-50 min-h-15">
                    {aksiMasukan || '-'}
                  </div>
                </div>
              </>
            ) : (
              <>
                <label className="text-[11px] font-bold uppercase block mb-2">Keputusan :</label>
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setKeputusan("ditindaklanjuti")}
                    className={`flex-1 py-2 border-2 text-[11px] font-bold flex items-center justify-center gap-1.5 ${
                      keputusan === "ditindaklanjuti"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-gray-200 text-gray-400"
                    }`}
                  >
                    <RefreshCw size={14} /> Perbaikan Berkelanjutan
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeputusan("tidak")}
                    className={`flex-1 py-2 border-2 text-[11px] font-bold flex items-center justify-center gap-1.5 ${
                      keputusan === "tidak"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 text-gray-400"
                    }`}
                  >
                    <CheckCircle2 size={14} /> Sesuai
                  </button>
                </div>

                <div className="mb-4">
                  <label className="text-[11px] font-bold uppercase block mb-1">
                    Aksi / Masukan ke Kepala Unit (wajib) :
                  </label>
                  <AutoResizeTextarea
                    minHeight={96}
                    className="w-full border border-black p-2 text-xs outline-none"
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
                  className="px-6 py-2 bg-blue-polibatam text-white text-[11px] font-bold disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Update Keputusan"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER PERIODE ── */}
      <div className="mb-4">
        <PeriodFilterBar
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          highlightedDates={highlightedDates}
          showCalendar={false}
        />
  
        <p className="mt-2 text-[11px] text-gray-500 italic">
          Menampilkan{" "}
          <span className="bg-[#4E617A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {filteredData.length} laporan
          </span>
        </p>
      </div>


      {/* ── TABEL ── */}
      <div className="w-full border-2 border-black bg-white text-xs">
        {msgOk && (
          <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b flex items-center gap-1.5">
            <CheckCircle2 size={14} /> {msgOk}
          </p>
        )}
        {error && !modal.open && (
          <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b flex items-center gap-1.5">
            <XCircle size={14} /> {error}
          </p>
        )}

        {/* ── MOBILE (card list) ── */}
        <div className="sm:hidden">
          {groupedData.length === 0 ? (
            <div className="p-12 text-center text-gray-400 italic text-sm">
              {filterMode === "semua"
                ? "Belum ada rancangan dari Kepala Unit."
                : `Tidak ada laporan untuk periode ${filterModeLabel[filterMode]}.`}
            </div>
          ) : (

            groupedData.map((group, gIdx) => (
              <div
                key={group.id_laporan}
                className={`p-4 space-y-3 ${gIdx > 0 ? "border-t-2 border-black" : ""}`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#4E617A] bg-blue-50 px-2 py-0.5 rounded">
                      {group.kode_laporan}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Laporan Civitas</p>
                  <div className="border border-gray-300 p-2 text-[11px] rounded whitespace-pre-wrap break-words">{group.isi_laporan}</div>
                  {group.lampiran_laporan && (
                    <button
                      onClick={() => {
                        const url = `${BASE_URL}/uploads/${group.lampiran_laporan}`;
                        setModalSrc(url);
                      }}
                      className="mt-1 text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <ImageIcon size={12} /> Lihat Gambar
                    </button>
                  )}
                </div>

                {group.units.map((item, uIdx) => {
                  const badge = item.status_review ? statusBadge[item.status_review] : null;
                  const bisaPutus = item.status_review === "menunggu_keputusan_ka";
                  const sudahDiputus = item.status_review === "ditindaklanjuti" || item.status_review === "tidak_ditindaklanjuti";

                  return (
                    <div
                      key={item.id_boxing}
                      className={`space-y-2 ${uIdx > 0 ? "pt-3 border-t border-dashed border-gray-300" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          Unit: {item.nama_unit}
                        </span>
                        {badge && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 border rounded flex items-center gap-1 ${badge.cls}`}>
                            <badge.Icon size={11} />
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Calendar size={11} />
                        Tanggal Masuk: {item.created_at
                          ? new Date(item.created_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '-'}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Penyebab</p>
                          <div className="border border-black p-2 text-[10px] rounded min-h-15 whitespace-pre-wrap break-words">
                            {item.penyebab || "—"}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rencana Unit</p>
                          {/* ✅ Rencana Unit jadi list turun ke bawah */}
                          <RencanaList rencana={item.rencana_tindakan} textClass="text-[10px]" />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Target size={11} />
                        Target Selesai: {item.tanggal_rencana
                          ? new Date(item.tanggal_rencana).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '-'}
                      </p>
                      <div className="flex items-center gap-2">
                        {bisaPutus ? (
                          <button
                            type="button"
                            onClick={() => openModalEdit(item)}
                            className="flex-1 bg-blue-polibatam text-white font-bold py-2 text-[10px] rounded"
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
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* ── DESKTOP: SATU CSS GRID untuk header + semua baris ── */}
        <div className="hidden sm:block overflow-x-auto">
          <div
            className="grid text-[11px] min-w-225"
            style={{ gridTemplateColumns: "22fr 14fr 16fr 20fr 12fr 16fr" }}
          >
            {/* HEADER */}
            <div className="font-bold uppercase bg-gray-50 border-b-2 border-r-2 border-black p-3 text-center">Laporan Civitas</div>
            <div className="font-bold uppercase bg-gray-50 border-b-2 border-r-2 border-black p-3 text-center">Tanggal Masuk</div>
            <div className="font-bold uppercase bg-gray-50 border-b-2 border-r-2 border-black p-3 text-center">Penyebab</div>
            <div className="font-bold uppercase bg-gray-50 border-b-2 border-r-2 border-black p-3 text-center">Rencana Unit</div>
            <div className="font-bold uppercase bg-gray-50 border-b-2 border-r-2 border-black p-3 text-center">Status</div>
            <div className="font-bold uppercase bg-gray-50 border-b-2 border-black p-3 text-center">Aksi</div>

            {groupedData.length === 0 ? (
              <div className="col-span-6 p-12 text-center text-gray-400 italic text-sm">
                {filterMode === "semua"
                  ? "Belum ada rancangan dari Kepala Unit."
                  : `Tidak ada laporan untuk periode ${filterModeLabel[filterMode]}.`}
              </div>
            ) : (
              groupedData.map((group) => {
                const rowSpan = group.units.length;
                return (
                  <Fragment key={group.id_laporan}>
                    {/* Kolom 1: Laporan Civitas — SATU sel, span N baris. */}
                    <div
                      style={{ gridRow: `span ${rowSpan}` }}
                      className="border-r-2 border-b-2 border-black p-4"
                    >
                      <p className="text-[10px] text-gray-400 mb-1">
                        {group.kode_laporan}
                      </p>
                      <div className="border border-black p-2 min-h-18 text-[11px] whitespace-pre-wrap break-words">
                        {group.isi_laporan}
                      </div>
                      {group.lampiran_laporan && (
                        <button
                          onClick={() => {
                            const url = `${BASE_URL}/uploads/${group.lampiran_laporan}`;
                            setModalSrc(url);
                          }}
                          className="mt-1 text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <ImageIcon size={12} /> Lihat Gambar
                        </button>
                      )}
                    </div>

                    {/* Kolom 2–6: satu baris grid per unit tujuan. */}
                    {group.units.map((item, uIdx) => {
                      const badge = item.status_review ? statusBadge[item.status_review] : null;
                      const bisaPutus = item.status_review === "menunggu_keputusan_ka";
                      const sudahDiputus = item.status_review === "ditindaklanjuti" || item.status_review === "tidak_ditindaklanjuti";
                      const isLastUnit = uIdx === rowSpan - 1;
                      const rowBorder = isLastUnit ? "border-b-2 border-black" : "border-b border-black";

                      return (
                        <Fragment key={item.id_boxing}>
                          {/* Tanggal Masuk + label unit */}
                          <div className={`border-r-2 border-black p-4 flex flex-col items-center justify-center gap-1 text-center ${rowBorder}`}>
                            <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {item.nama_unit}
                            </span>
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

                          {/* Penyebab */}
                          <div className={`border-r-2 border-black p-4 ${rowBorder}`}>
                            <div className="border border-black p-2 min-h-18 text-[10px] whitespace-pre-wrap break-words">
                              {item.penyebab || "—"}
                            </div>
                          </div>

                          {/* Rencana Unit + Target Selesai — ✅ jadi list vertikal */}
                          <div className={`border-r-2 border-black p-4 space-y-1 ${rowBorder}`}>
                            <RencanaList rencana={item.rencana_tindakan} textClass="text-[10px]" />
                            <p className="text-[9px] text-gray-500 text-center flex items-center justify-center gap-1">
                              <Target size={10} />
                              Target: {item.tanggal_rencana
                                ? new Date(item.tanggal_rencana).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '-'}
                            </p>
                          </div>

                          {/* Status */}
                          <div className={`border-r-2 border-black p-4 flex items-center justify-center ${rowBorder}`}>
                            {badge && (
                              <span className={`text-[9px] font-bold px-1 py-1 border rounded text-center flex items-center gap-1 ${badge.cls}`}>
                                <badge.Icon size={11} />
                                {badge.label}
                              </span>
                            )}
                          </div>

                          {/* Aksi */}
                          <div className={`p-4 flex flex-col items-center justify-center gap-1 ${rowBorder}`}>
                            {bisaPutus ? (
                              <button
                                type="button"
                                onClick={() => openModalEdit(item)}
                                className="w-full bg-blue-polibatam text-white font-bold py-2 text-[10px] rounded hover:bg-blue-600 transition-colors"
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
                              <span className="text-[10px] text-gray-400 text-center font-normal">Sudah diputuskan</span>
                            )}
                          </div>
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}