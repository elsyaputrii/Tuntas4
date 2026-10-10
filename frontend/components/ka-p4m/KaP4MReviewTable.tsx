"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { kaP4MApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import {
  Pencil,
  Eye,
  Clock,
  RefreshCw,
  CheckCircle2,
  Calendar,
  XCircle,
  Image as ImageIcon,
  Mail,
  Target,
  Search,
  Filter,
  X,
} from "lucide-react";
import {
  PeriodFilterBar,
  isInPeriodFilter,
  type FilterMode,
} from "@/components/shared/PeriodFilterBar";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "http://localhost:5000";

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
  status_boxing?: string | null;
}

interface RencanaItem {
  nomor: string;
  teks: string;
  tanggal: string;
}

const statusBadge: Record<
  string,
  { label: string; cls: string; Icon: typeof Clock }
> = {
  menunggu_keputusan_ka: {
    label: "Menunggu Tinjauan",
    cls: "text-blue-600 bg-blue-50 border-blue-200",
    Icon: Clock,
  },
  ditindaklanjuti: {
    label: "Tindak Lanjut",
    cls: "text-red-600 bg-red-50 border-red-200",
    Icon: RefreshCw,
  },
  tidak_ditindaklanjuti: {
    label: "Sesuai",
    cls: "text-green-600 bg-green-50 border-green-200",
    Icon: CheckCircle2,
  },
  selesai: {
    label: "Selesai",
    cls: "text-emerald-700 bg-emerald-50 border-emerald-300",
    Icon: CheckCircle2,
  },
};

/**
 * Parse string rencana dari backend.
 * Format asli: "Rencana 1: Teks A (20/09/2026)\nRencana 2: Teks B (25/09/2026)"
 */
function parseRencana(rencana: string | null | undefined): RencanaItem[] {
  if (!rencana) return [];

  const cleanText = rencana.replace(/\r/g, "").trim();
  const parts = cleanText
    .split(/(?=Rencana\s*\d+\s*:)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const items: RencanaItem[] = [];

  for (const part of parts) {
    const matchPrefix = /^Rencana\s*(\d+)\s*:\s*/i.exec(part);
    if (!matchPrefix) continue;

    const nomor = matchPrefix[1];
    let body = part.slice(matchPrefix[0].length).trim();

    let tanggal = "";
    const matchTgl = /\(([^)]*)\)\s*$/.exec(body);
    if (matchTgl) {
      tanggal = matchTgl[1].trim();
      body = body.slice(0, matchTgl.index).trim();
    }

    items.push({ nomor, teks: body, tanggal });
  }

  return items;
}

/**
 * Komponen: render list rencana dengan format:
 *   Rencana 1:
 *   <teks>
 *   <tanggal>
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
      <div
        className={`border border-black p-2 min-h-15 ${textClass} text-gray-400`}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div className={`border border-black p-2 min-h-15 ${textClass}`}>
      <div className="space-y-3">
        {items.map((r, i) => (
          <div key={i} className="leading-relaxed">
            <p className="font-bold text-gray-800">Rencana {r.nomor}:</p>
            <p className="text-gray-700 text-justify whitespace-pre-wrap break-words">
              {r.teks}
            </p>
            {r.tanggal && (
              <p className="text-[9px] text-gray-500 mt-0.5">{r.tanggal}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KaP4MReviewTable() {
  const [data, setData] = useState<RancanganItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msgOk, setMsgOk] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [filterMode, setFilterMode] = useState<FilterMode>("semua");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const filterModeLabel: Record<FilterMode, string> = {
    semua: "semua waktu",
    harian: "harian",
    mingguan: "mingguan",
    bulanan: "bulanan",
    tahunan: "tahunan",
  };

  const [modal, setModal] = useState<{
    open: boolean;
    item: RancanganItem | null;
    mode: "view" | "edit";
  }>({
    open: false,
    item: null,
    mode: "view",
  });

  const [keputusan, setKeputusan] = useState<
    "ditindaklanjuti" | "tidak"
  >("ditindaklanjuti");
  const [aksiMasukan, setAksiMasukan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalSrc, setModalSrc] = useState<string | null>(null);

  const [initialKeputusan, setInitialKeputusan] = useState<
    "ditindaklanjuti" | "tidak"
  >("ditindaklanjuti");
  const [initialAksiMasukan, setInitialAksiMasukan] = useState("");

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
      setError(
        err instanceof Error ? err.message : "Gagal memuat data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const statusBoxing = item.status_boxing ?? "";
      if (statusBoxing === "di_staff" || statusBoxing === "selesai") {
        return false;
      }

      const matchPeriod = isInPeriodFilter(
        filterMode,
        selectedDate,
        (value) => new Date(value),
        item.created_at
      );
      if (!matchPeriod) return false;

      if (
        statusFilter !== "semua" &&
        item.status_review !== statusFilter
      ) {
        return false;
      }

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchKode = item.kode_laporan
          ?.toLowerCase()
          .includes(query);
        const matchIsi = item.isi_laporan
          ?.toLowerCase()
          .includes(query);
        const matchUnit = item.nama_unit
          ?.toLowerCase()
          .includes(query);
        const matchPenyebab = item.penyebab
          ?.toLowerCase()
          .includes(query);
        const matchRencana = item.rencana_tindakan
          ?.toLowerCase()
          .includes(query);

        if (
          !matchKode &&
          !matchIsi &&
          !matchUnit &&
          !matchPenyebab &&
          !matchRencana
        ) {
          return false;
        }
      }

      return true;
    });
  }, [data, filterMode, selectedDate, statusFilter, searchQuery]);

  const highlightedDates = useMemo(() => {
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
    const map = new Map<
      number,
      {
        id_laporan: number;
        kode_laporan: string;
        isi_laporan: string;
        lampiran_laporan?: string | null;
        units: RancanganItem[];
      }
    >();
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
    const k =
      item.status_review === "ditindaklanjuti" ? "ditindaklanjuti" : "tidak";
    const a = item.aksi_masukan || "";
    setModal({ open: true, item, mode: "view" });
    setKeputusan(k);
    setAksiMasukan(a);
    setInitialKeputusan(k);
    setInitialAksiMasukan(a);
    setError("");
  }

  function openModalEdit(item: RancanganItem) {
    const k =
      item.status_review === "ditindaklanjuti" ? "ditindaklanjuti" : "tidak";
    const a = item.aksi_masukan || "";
    setModal({ open: true, item, mode: "edit" });
    setKeputusan(k);
    setAksiMasukan(a);
    setInitialKeputusan(k);
    setInitialAksiMasukan(a);
    setError("");
  }

  function closeModal() {
    setModal({ open: false, item: null, mode: "view" });
  }

  function isAlreadyReviewed(item: RancanganItem | null): boolean {
    if (!item) return false;
    return (
      item.status_review === "ditindaklanjuti" ||
      item.status_review === "tidak_ditindaklanjuti" ||
      item.status_review === "selesai"
    );
  }

  const isDirty =
    keputusan !== initialKeputusan ||
    aksiMasukan.trim() !== initialAksiMasukan.trim();

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

      const label =
        keputusan === "ditindaklanjuti" ? "Tindak Lanjut" : "Sesuai";

      const wasReviewed = isAlreadyReviewed(modal.item);
      setMsgOk(
        wasReviewed
          ? `Tinjauan berhasil diperbarui menjadi "${label}"!`
          : `Tinjauan berhasil dikirim dengan status "${label}"!`
      );
      setTimeout(() => setMsgOk(""), 4000);
      closeModal();
      fetchData();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan tinjauan."
      );
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
      {modalSrc && (
        <ImageModal src={modalSrc} onClose={() => setModalSrc(null)} />
      )}

      {/* ── MODAL ── */}
      {modal.open && modal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative bg-white border-2 border-black w-full max-w-lg p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={closeModal}
              aria-label="Tutup"
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
              title="Tutup"
            >
              <X size={18} />
            </button>

            <h3 className="font-bold text-sm uppercase mb-1 border-b-2 border-black pb-2 flex items-center gap-2 pr-8">
              {modal.mode === "edit" ? (
                <>
                  <Pencil size={16} />{" "}
                  {isAlreadyReviewed(modal.item)
                    ? "Edit Tinjauan"
                    : "Beri Tinjauan"}{" "}
                  — {modal.item!.kode_laporan}
                </>
              ) : (
                <>
                  <Mail size={16} /> Lihat Tinjauan —{" "}
                  {modal.item!.kode_laporan}
                </>
              )}
            </h3>
            <p className="text-[11px] text-gray-500 mb-3">
              Unit: <strong>{modal.item!.nama_unit}</strong>
            </p>

            <div className="bg-gray-50 border p-3 mb-4 text-[11px] space-y-2">
              <p className="leading-relaxed text-justify whitespace-pre-wrap break-words">
                <span className="font-bold">Laporan civitas:</span>{" "}
                {modal.item!.isi_laporan}
              </p>
              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                <Calendar size={12} />
                Tanggal Masuk:{" "}
                {modal.item!.created_at
                  ? new Date(modal.item!.created_at).toLocaleDateString(
                      "id-ID",
                      {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }
                    )
                  : "-"}
              </p>
              {modal.item!.lampiran_laporan && (
                <button
                  onClick={() => {
                    const url = `${BASE_URL}/uploads/${modal.item!
                      .lampiran_laporan}`;
                    setModalSrc(url);
                  }}
                  className="text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                >
                  <ImageIcon size={12} /> Lihat Gambar
                </button>
              )}
              <p className="leading-relaxed text-justify whitespace-pre-wrap break-words">
                <span className="font-bold">
                  Penyebab (Kepala Unit):
                </span>{" "}
                {modal.item!.penyebab}
              </p>

              <div>
                <p className="font-bold mb-1">
                  Rencana (Kepala Unit):
                </p>
                <RencanaList
                  rencana={modal.item!.rencana_tindakan}
                  textClass="text-[11px]"
                  emptyText="Belum ada rencana"
                />
              </div>

              <p className="flex items-center gap-1">
                <Target size={12} className="text-gray-600 shrink-0" />
                <span className="font-bold">
                  Target Selesai (Tanggal Rencana):
                </span>{" "}
                {modal.item!.tanggal_rencana
                  ? new Date(
                      modal.item!.tanggal_rencana
                    ).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "-"}
              </p>
            </div>

            {modal.mode === "view" ? (
              <>
                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase block mb-1">
                    Tinjauan:
                  </p>
                  <div
                    className={`p-2 border rounded text-xs font-semibold inline-flex items-center gap-1.5 ${
                      keputusan === "ditindaklanjuti"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-green-500 bg-green-50 text-green-700"
                    }`}
                  >
                    {keputusan === "ditindaklanjuti" ? (
                      <>
                        <RefreshCw size={14} /> Tindak Lanjut
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} /> Sesuai
                      </>
                    )}
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase block mb-1">
                    Aksi / Masukan:
                  </p>
                  <div className="border border-black p-2 text-xs rounded bg-gray-50 min-h-15 leading-relaxed text-justify whitespace-pre-wrap break-words">
                    {aksiMasukan || "-"}
                  </div>
                </div>
              </>
            ) : (
              <>
                <label className="text-[11px] font-bold uppercase block mb-2">
                  Tinjauan :
                </label>
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
                    <RefreshCw size={14} /> Tindak Lanjut
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
                    className="w-full border border-black p-2 text-xs outline-none leading-relaxed"
                    placeholder="Instruksi tindak lanjut untuk kepala unit..."
                    value={aksiMasukan}
                    onChange={(e) => setAksiMasukan(e.target.value)}
                  />
                </div>
              </>
            )}

            {error && (
              <p className="text-red-500 text-xs mb-3">{error}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 border border-black text-[11px]"
              >
                Tutup
              </button>
              {modal.mode === "edit" && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !isDirty}
                  className="px-6 py-2 bg-blue-polibatam text-white text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    !isDirty
                      ? "Tidak ada perubahan untuk disimpan"
                      : ""
                  }
                >
                  {submitting
                    ? "Menyimpan..."
                    : isAlreadyReviewed(modal.item)
                    ? "Update Keputusan"
                    : "Kirim"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="mb-4 space-y-3">
        <div>
          <PeriodFilterBar
            filterMode={filterMode}
            onFilterModeChange={setFilterMode}
            selectedDate={selectedDate}
            onSelectedDateChange={setSelectedDate}
            highlightedDates={highlightedDates}
            showCalendar={false}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11px] text-gray-500 italic">
            Menampilkan{" "}
            <span className="bg-[#4E617A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {filteredData.length} laporan
            </span>{" "}
            {filterModeLabel[filterMode]}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto justify-end">
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kata kunci..."
                className="w-full pl-8 pr-2 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-black bg-white"
              />
            </div>

            <div className="relative w-full sm:w-auto flex items-center gap-1.5 border border-gray-300 focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-200 px-3 py-2 bg-white rounded-md shrink-0">
              <Filter size={14} className="text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-transparent outline-none cursor-pointer w-full"
              >
                <option value="semua">Semua Status Tinjauan</option>
                <option value="menunggu_keputusan_ka">
                  Menunggu Tinjauan
                </option>
                <option value="ditindaklanjuti">Tindak Lanjut</option>
                <option value="tidak_ditindaklanjuti">Sesuai</option>
                <option value="selesai">Selesai</option>
              </select>
            </div>
          </div>
        </div>
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

        {/* ── MOBILE ── */}
        <div className="sm:hidden">
          {groupedData.length === 0 ? (
            <div className="p-12 text-center text-gray-400 italic text-sm">
              {searchQuery || statusFilter !== "semua"
                ? "Tidak ada data yang sesuai dengan kriteria pencarian/filter."
                : filterMode === "semua"
                ? "Belum ada rancangan dari Kepala Unit."
                : `Tidak ada laporan untuk periode ${
                    filterModeLabel[filterMode]
                  }.`}
            </div>
          ) : (
            groupedData.map((group, gIdx) => (
              <div
                key={group.id_laporan}
                className={`p-4 space-y-3 ${
                  gIdx > 0 ? "border-t-2 border-black" : ""
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#4E617A] bg-blue-50 px-2 py-0.5 rounded">
                      {group.kode_laporan}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Laporan Civitas
                  </p>
                  <div className="border border-gray-300 p-2 text-[11px] rounded whitespace-pre-wrap break-words leading-relaxed text-justify">
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

                {group.units.map((item, uIdx) => {
                  const badge = item.status_review
                    ? statusBadge[item.status_review]
                    : null;
                  const bisaPutus =
                    item.status_review === "menunggu_keputusan_ka";
                  const sudahDiputus =
                    item.status_review === "ditindaklanjuti" ||
                    item.status_review === "tidak_ditindaklanjuti" ||
                    item.status_review === "selesai";

                  return (
                    <div
                      key={item.id_boxing}
                      className={`space-y-2 ${
                        uIdx > 0
                          ? "pt-3 border-t border-dashed border-gray-300"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          Unit: {item.nama_unit}
                        </span>
                        {badge && (
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 border rounded flex items-center gap-1 ${badge.cls}`}
                          >
                            <badge.Icon size={11} />
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Calendar size={11} />
                        Tanggal Masuk:{" "}
                        {item.created_at
                          ? new Date(
                              item.created_at
                            ).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })
                          : "-"}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                            Penyebab
                          </p>
                          <div className="border border-black p-2 text-[10px] rounded min-h-15 whitespace-pre-wrap break-words leading-relaxed text-justify">
                            {item.penyebab || "—"}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                            Rencana Unit
                          </p>
                          <RencanaList
                            rencana={item.rencana_tindakan}
                            textClass="text-[10px]"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Target size={11} />
                        Target Selesai:{" "}
                        {item.tanggal_rencana
                          ? new Date(
                              item.tanggal_rencana
                            ).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })
                          : "-"}
                      </p>
                      <div className="flex items-center gap-2">
                        {bisaPutus ? (
                          <button
                            type="button"
                            onClick={() => openModalEdit(item)}
                            className="flex-1 bg-blue-polibatam text-white font-bold py-2 text-[10px] rounded"
                          >
                            Hasil Tinjauan Tindakan
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
                              title="Edit Tinjauan"
                            >
                              <Pencil size={14} />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-400 text-center w-full">
                            Sudah diputuskan
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* ── DESKTOP ── */}
        <div className="hidden sm:block overflow-x-auto">
          <div
            className="grid text-[11px] min-w-225"
            style={{
              // ✅ Layout baru: kolom Laporan & Rencana lebih lebar,
              //    Tanggal Masuk & Status lebih kecil
              gridTemplateColumns: "26fr 10fr 18fr 26fr 8fr 12fr",
            }}
          >
            <div className="font-bold uppercase bg-gray-50 border-b-2 border-r-2 border-black p-3 text-center">
              Laporan Civitas
            </div>
            <div className="font-bold uppercase bg-gray-50 border-b-2 border-r-2 border-black p-3 text-center">
              Tanggal Masuk
            </div>
            <div className="font-bold uppercase bg-gray-50 border-b-2 border-r-2 border-black p-3 text-center">
              Penyebab
            </div>
            <div className="font-bold uppercase bg-gray-50 border-b-2 border-r-2 border-black p-3 text-center">
              Rencana Unit
            </div>
            <div className="font-bold uppercase bg-gray-50 border-b-2 border-r-2 border-black p-3 text-center">
              Status
            </div>
            <div className="font-bold uppercase bg-gray-50 border-b-2 border-black p-3 text-center">
              Aksi
            </div>

            {groupedData.length === 0 ? (
              <div className="col-span-6 p-12 text-center text-gray-400 italic text-sm">
                {searchQuery || statusFilter !== "semua"
                  ? "Tidak ada data yang sesuai dengan kriteria pencarian/filter."
                  : filterMode === "semua"
                  ? "Belum ada rancangan dari Kepala Unit."
                  : `Tidak ada laporan untuk periode ${
                      filterModeLabel[filterMode]
                    }.`}
              </div>
            ) : (
              groupedData.map((group) => {
                const rowSpan = group.units.length;
                return (
                  <Fragment key={group.id_laporan}>
                    <div
                      style={{ gridRow: `span ${rowSpan}` }}
                      className="border-r-2 border-b-2 border-black p-4"
                    >
                      <p className="text-[10px] text-gray-400 mb-1">
                        {group.kode_laporan}
                      </p>
                      <div className="border border-black p-2 min-h-18 text-[11px] whitespace-pre-wrap break-words leading-relaxed text-justify">
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

                    {group.units.map((item, uIdx) => {
                      const badge = item.status_review
                        ? statusBadge[item.status_review]
                        : null;
                      const bisaPutus =
                        item.status_review === "menunggu_keputusan_ka";
                      const sudahDiputus =
                        item.status_review === "ditindaklanjuti" ||
                        item.status_review === "tidak_ditindaklanjuti" ||
                        item.status_review === "selesai";
                      const isLastUnit = uIdx === rowSpan - 1;
                      const rowBorder = isLastUnit
                        ? "border-b-2 border-black"
                        : "border-b border-black";

                      return (
                        <Fragment key={item.id_boxing}>
                          {/* Tanggal Masuk — rata atas, kolom lebih kecil */}
                          <div
                            className={`border-r-2 border-black p-3 flex flex-col items-center justify-start gap-1 text-center pt-6 ${rowBorder}`}
                          >
                            <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {item.nama_unit}
                            </span>
                            <span className="text-[10px] text-gray-700 leading-tight">
                              {item.created_at
                                ? new Date(
                                    item.created_at
                                  ).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "-"}
                            </span>
                          </div>

                          {/* Penyebab */}
                          <div
                            className={`border-r-2 border-black p-4 ${rowBorder}`}
                          >
                            <div className="border border-black p-2 min-h-18 text-[10px] whitespace-pre-wrap break-words leading-relaxed text-justify">
                              {item.penyebab || "—"}
                            </div>
                          </div>

                          {/* Rencana — format list per blok */}
                          <div
                            className={`border-r-2 border-black p-4 space-y-1 ${rowBorder}`}
                          >
                            <RencanaList
                              rencana={item.rencana_tindakan}
                              textClass="text-[10px]"
                            />
                            <p className="text-[9px] text-gray-500 text-center flex items-center justify-center gap-1">
                              <Target size={10} />
                              Target:{" "}
                              {item.tanggal_rencana
                                ? new Date(
                                    item.tanggal_rencana
                                  ).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "-"}
                            </p>
                          </div>

                          {/* Status — rata atas, kolom kecil */}
                          <div
                            className={`border-r-2 border-black p-3 flex items-start justify-center pt-6 ${rowBorder}`}
                          >
                            {badge && (
                              <span
                                className={`text-[9px] font-bold px-1 py-1 border rounded text-center flex items-center gap-1 leading-tight ${badge.cls}`}
                              >
                                <badge.Icon size={10} />
                                {badge.label}
                              </span>
                            )}
                          </div>

                          {/* Aksi — rata atas */}
                          <div
                            className={`p-3 flex flex-col items-center justify-start gap-1 pt-6 ${rowBorder}`}
                          >
                            {bisaPutus ? (
                              <button
                                type="button"
                                onClick={() => openModalEdit(item)}
                                className="w-full bg-blue-polibatam text-white font-bold py-2 text-[10px] rounded hover:bg-blue-600 transition-colors"
                              >
                                Berikan Tinjauan
                              </button>
                            ) : sudahDiputus ? (
                              <div className="flex items-center gap-1 w-full">
                                <button
                                  type="button"
                                  onClick={() => openModalView(item)}
                                  className="flex-1 bg-blue-500 text-white font-bold py-1.5 text-[10px] rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                                >
                                  <Eye size={12} /> Lihat
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openModalEdit(item)}
                                  className="p-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                                  title="Edit Tinjauan"
                                >
                                  <Pencil size={12} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 text-center font-normal">
                                Sudah diputuskan
                              </span>
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