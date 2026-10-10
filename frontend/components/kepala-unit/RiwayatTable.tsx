// FILE: frontend/components/kepala-unit/RiwayatTable.tsx
"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { kepalaUnitApi } from "@/lib/api";
import { exportPDFRiwayatKepalaUnit } from "@/lib/exportPdf";
import { PeriodFilterBar, isInPeriodFilter, type FilterMode as PeriodFilterMode } from "@/components/shared/PeriodFilterBar";
import {
  CheckCircle2,
  RefreshCw,
  Clock,
  Wrench,
  FileText,
  Image as ImageIcon,
  Calendar,
  Search,
  X,
  FolderOpen,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

interface RiwayatItem {
  id_boxing: number;
  nama_unit: string | null;
  status_boxing: string | null;
  approval_staf: string | null;
  catatan_approval: string | null;
  id_laporan: number;
  jenis_laporan: string | null;
  isi_laporan: string | null;
  tanggal_laporan: string | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  status_review: string | null;
  aksi_masukan: string | null;
  id_pelaksanaan: number | null;
  hasil_tindakan: string | null;
  lampiran_hasil: string | null;
  tanggal_pelaksanaan: string | null;
  tanggal_kirim_hasil: string | null;
  kode_laporan: string;
}

interface RiwayatStats {
  total: number;
  selesai: number;
  persentase: number;
}

type FilterMode = "semua" | "selesai";

function statusBadge(item: RiwayatItem): { label: string; cls: string; Icon: typeof CheckCircle2 } {
  if (item.status_boxing === "selesai") {
    return { label: "Selesai", cls: "bg-green-100 text-green-700", Icon: CheckCircle2 };
  }
  if (item.status_boxing === "di_staff") {
    if (item.approval_staf === "ditolak") {
      return { label: "Perbaikan Berkelanjutan", cls: "bg-red-100 text-red-700", Icon: RefreshCw };
    }
    return { label: "Menunggu Tindakan Akhir Staf", cls: "bg-amber-100 text-amber-700", Icon: Clock };
  }
  if (item.status_boxing === "menunggu_pelaksanaan") {
    return { label: "Menunggu Pelaksanaan", cls: "bg-blue-100 text-blue-700", Icon: Wrench };
  }
  if (item.status_review === "menunggu_keputusan_ka") {
    return { label: "Menunggu Ka P4M", cls: "bg-amber-100 text-amber-700", Icon: Clock };
  }
  return { label: "Diproses", cls: "bg-blue-100 text-blue-700", Icon: RefreshCw };
}

function parseRencana(rencana: string | null | undefined): string[] {
  if (!rencana) return [];
  const cleanText = rencana.replace(/\r?\n|\r/g, " ").trim();
  const items = cleanText
    .split(/(?=Rencana\s*\d+:?)/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return items;
}

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
      <p className={`italic text-gray-400 ${textClass}`}>
        {emptyText}
      </p>
    );
  }

  return (
    <div className={`${textClass} text-gray-800 space-y-2`}>
      {items.map((item, i) => (
        <div
          key={i}
          className="leading-relaxed text-justify whitespace-pre-wrap break-words"
        >
          {item}
        </div>
      ))}
    </div>
  );
}

function hasilTindakLanjutText(item: RiwayatItem): string {
  if (item.hasil_tindakan) return item.hasil_tindakan;
  if (item.status_boxing === "selesai") return "Sudah Terselesaikan";
  return "—";
}

function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="relative" style={{ width: "85vw", maxWidth: "1100px" }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-gray-300 z-10" aria-label="Tutup">
          <X size={32} strokeWidth={2.5} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Bukti pelaksanaan"
          style={{ width: "100%", maxHeight: "85vh", objectFit: "contain", background: "white", borderRadius: "8px" }}
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = "none";
            const parent = el.parentElement;
            if (parent && !parent.querySelector(".err-msg")) {
              const msg = document.createElement("div");
              msg.className = "err-msg";
              msg.style.cssText = "color:#ef4444;padding:32px;text-align:center;background:white;border-radius:8px;font-size:13px";
              msg.innerText = "Gambar tidak ditemukan.\nURL: " + src;
              parent.appendChild(msg);
            }
          }}
        />
      </div>
    </div>
  );
}

function fmtTglSingkat(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function RiwayatTable() {
  const [data, setData] = useState<RiwayatItem[]>([]);
  const [stats, setStats] = useState<RiwayatStats>({ total: 0, selesai: 0, persentase: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("semua");
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [periodFilterMode, setPeriodFilterMode] = useState<PeriodFilterMode>("semua");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const ITEMS_PER_PAGE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterMode, periodFilterMode, selectedDate, searchQuery]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await kepalaUnitApi.getRiwayat();
      const items: RiwayatItem[] = res.data ?? [];
      setData(items);
      const total = res.stats?.total ?? items.length;
      const selesai =
        res.stats?.selesai ?? items.filter((d) => d.status_boxing === "selesai").length;
      const persentase =
        res.stats?.persentase ?? (total > 0 ? Math.round((selesai / total) * 100) : 0);
      setStats({ total, selesai, persentase });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data riwayat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const highlightedDates = useMemo(() => {
    const dates = new Set<string>();
    data.forEach((item) => {
      if (!item.tanggal_laporan) return;
      const d = new Date(item.tanggal_laporan);
      if (isNaN(d.getTime())) return;
      const key = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");
      dates.add(key);
    });
    return dates;
  }, [data]);

  function getImageUrl(lampiran: string | null): string {
    if (!lampiran) return "";
    if (lampiran.startsWith("http")) return lampiran;
    if (lampiran.startsWith("uploads/")) return `${BASE_URL}/${lampiran}`;
    return `${BASE_URL}/uploads/${lampiran}`;
  }

  async function handleExportPDF(item: RiwayatItem) {
    setExportingId(item.id_boxing);
    try {
      await exportPDFRiwayatKepalaUnit({
        kode_laporan: item.kode_laporan,
        jenis_laporan: item.jenis_laporan,
        isi_laporan: item.isi_laporan,
        nama_unit: item.nama_unit,
        status_boxing: item.status_boxing,
        status_review: item.status_review,
        approval_staf: item.approval_staf,
        catatan_approval: item.catatan_approval,
        aksi_masukan: item.aksi_masukan,
        penyebab: item.penyebab,
        rencana_tindakan: item.rencana_tindakan,
        hasil_tindakan: item.hasil_tindakan,
        lampiran_hasil: item.lampiran_hasil,
        tanggal_pelaksanaan: item.tanggal_pelaksanaan,
        tanggal_laporan: item.tanggal_laporan,
      });
    } finally {
      setExportingId(null);
    }
  }

  const filteredData = useMemo(
    () =>
      data.filter((item) => {
        const statusMatch =
          filterMode === "semua"
            ? true
            : item.status_boxing === "selesai";

        const periodMatch = isInPeriodFilter(
          periodFilterMode,
          selectedDate,
          (value) => new Date(value),
          item.tanggal_laporan
        );

        const q = searchQuery.trim().toLowerCase();
        const searchMatch = !q || (
          (item.kode_laporan?.toLowerCase().includes(q) ?? false) ||
          (item.isi_laporan?.toLowerCase().includes(q) ?? false) ||
          (item.rencana_tindakan?.toLowerCase().includes(q) ?? false) ||
          (item.hasil_tindakan?.toLowerCase().includes(q) ?? false)
        );

        return statusMatch && periodMatch && searchMatch;
      }),
    [data, filterMode, periodFilterMode, selectedDate, searchQuery] 
  );

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));

  const paginatedData = useMemo(
    () =>
      filteredData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      ),
    [filteredData, currentPage]
  );

  if (loading) return (
    <div className="w-full border-2 border-black bg-white p-12 text-center">
      <div className="w-6 h-6 border-4 border-blue-polibatam border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-gray-400 text-xs">Memuat data riwayat...</p>
    </div>
  );

  if (error) return (
    <div className="w-full border-2 border-red-400 bg-red-50 p-8 text-center">
      <p className="text-red-500 text-sm">{error}</p>
      <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-blue-polibatam text-white text-xs rounded">Coba Lagi</button>
    </div>
  );

  function isHasilTerselesaikan(item: RiwayatItem): boolean {
    return !item.hasil_tindakan && item.status_boxing === "selesai";
  }

  return (
    <>
      {selectedImage && <ImageModal src={selectedImage} onClose={() => setSelectedImage(null)} />}

      <div className="w-full space-y-4">
        {/* Ringkasan rekap */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border-2 border-black bg-white p-3 text-center">
            <p className="text-[9px] uppercase font-bold text-gray-400">Total Laporan</p>
            <p className="text-xl font-black text-gray-800">{stats.total}</p>
          </div>
          <div className="border-2 border-black bg-green-50 p-3 text-center">
            <p className="text-[9px] uppercase font-bold text-green-600 inline-flex items-center gap-1">
              <CheckCircle2 size={10} /> Selesai
            </p>
            <p className="text-xl font-black text-green-700">{stats.selesai}</p>
          </div>
          <div className="border-2 border-black bg-blue-50 p-3 text-center">
            <p className="text-[9px] uppercase font-bold text-blue-600">Persentase Selesai</p>
            <p className="text-xl font-black text-blue-700">{stats.persentase}%</p>
          </div>
        </div>

        {/* Filter periode + pencarian + filter status */}
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="shrink-0">
            <PeriodFilterBar
              filterMode={periodFilterMode}
              onFilterModeChange={setPeriodFilterMode}
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              highlightedDates={highlightedDates}
              showCalendar={false}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari kode/uraian..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-52 sm:w-62 pl-8 pr-8 py-1.5 text-xs border-2 border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Bersihkan"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter Status — pakai Lucide */}
            {(["semua", "selesai"] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all inline-flex items-center gap-1.5 ${
                  filterMode === mode
                    ? "bg-dark-header text-white border-dark-header shadow"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {mode === "semua" ? (
                  <>
                    <FolderOpen size={12} /> Semua
                  </>
                ) : (
                  <>
                    <Check size={12} /> Selesai
                  </>
                )}
              </button>
            ))}

            <span className="text-[9px] text-gray-400 italic whitespace-nowrap">
              {filteredData.length} laporan
            </span>
          </div>
        </div>

        {/* Tabel — DESKTOP */}
        <div className="hidden md:block w-full border-2 border-black bg-white overflow-x-auto text-xs">
          <div className="flex min-w-175 font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[10px]">
            <div className="w-24 border-r-2 border-black p-2">Kode</div>
            <div className="flex-1 border-r-2 border-black p-2">Uraian Ketidaksesuaian</div>
            <div className="w-40 border-r-2 border-black p-2">Rencana Tindakan</div>
            <div className="flex-1 border-r-2 border-black p-2">Hasil Tindak Lanjut</div>
            <div className="w-32 border-r-2 border-black p-2 align-top">Status</div>
            <div className="w-24 p-2 align-top">PDF</div>
          </div>
          {filteredData.length === 0 ? (
            <div className="flex p-10 justify-center border-t-2 border-black">
              <p className="text-gray-400 italic text-sm">
                {searchQuery
                  ? "Tidak ada laporan yang cocok dengan pencarian Anda."
                  : filterMode === "selesai"
                  ? "Belum ada laporan yang selesai untuk unit ini."
                  : "Belum ada laporan yang pernah ditangani unit ini."}
              </p>
            </div>
          ) : (
            paginatedData.map((item) => {
              const badge = statusBadge(item);
              return (
                <div key={item.id_boxing} className="flex min-w-175 border-t-2 border-black text-[11px]">
                  <div className="w-24 border-r-2 border-black p-3 align-top">
                    <p className="font-bold text-[10px]">{item.kode_laporan}</p>
                    <p className="text-[9px] text-gray-400 mt-1 inline-flex items-center gap-1">
                      <Calendar size={10} /> {fmtTglSingkat(item.tanggal_laporan)}
                    </p>
                  </div>
                  {/* Uraian — rata kiri-kanan + jarak paragraf */}
                  <div className="flex-1 border-r-2 border-black p-3">
                    <div className="border border-gray-400 p-2 min-h-16 leading-relaxed text-justify whitespace-pre-wrap break-words">
                      {item.isi_laporan}
                    </div>
                  </div>
                  <div className="w-40 border-r-2 border-black p-3">
                    <div className="min-h-16">
                      <RencanaList rencana={item.rencana_tindakan} />
                    </div>
                  </div>
                  {/* Hasil Tindak Lanjut — rata kiri-kanan */}
                  <div className="flex-1 border-r-2 border-black p-3">
                    <div className="border border-gray-400 p-2 min-h-16 leading-relaxed text-justify whitespace-pre-wrap break-words">
                      {isHasilTerselesaikan(item) ? (
                        <span className="italic text-gray-400">Sudah Terselesaikan</span>
                      ) : (
                        hasilTindakLanjutText(item)
                      )}
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1 inline-flex items-center gap-1">
                      <Calendar size={10} /> {fmtTglSingkat(item.tanggal_pelaksanaan)}
                    </p>
                    {item.lampiran_hasil && (
                      <button type="button" onClick={() => setSelectedImage(getImageUrl(item.lampiran_hasil))}
                        className="mt-1 flex items-center gap-1 text-[9px] text-blue-600 hover:underline">
                        <ImageIcon size={11} /> Lihat Gambar
                      </button>
                    )}
                  </div>
                  {/* Status — rata ATAS */}
                  <div className="w-32 border-r-2 border-black p-3 flex items-start justify-center pt-6">
                    <span className={`text-[9px] font-bold text-center px-2 py-1 rounded leading-tight inline-flex items-center gap-1 ${badge.cls}`}>
                      <badge.Icon size={10} />
                      {badge.label}
                    </span>
                  </div>
                  {/* PDF — rata ATAS */}
                  <div className="w-24 p-2 flex items-start justify-center pt-6">
                    <button type="button" onClick={() => handleExportPDF(item)} disabled={exportingId === item.id_boxing}
                      className="flex flex-col items-center gap-0.5 px-2 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[8px] font-bold rounded w-full">
                      {exportingId === item.id_boxing
                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><FileText size={12} /><span>PDF</span></>}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Tabel — MOBILE card */}
        <div className="md:hidden w-full border-2 border-black bg-white text-xs">
          <div className="border-b-2 border-black px-3 py-2 bg-gray-50 text-[10px] font-bold uppercase text-gray-500">
            Daftar Riwayat · {filteredData.length} item
          </div>
          {filteredData.length === 0 ? (
            <div className="p-8 text-center text-gray-400 italic">
              {searchQuery
                ? "Tidak ada laporan yang cocok dengan pencarian Anda."
                : filterMode === "selesai"
                ? "Belum ada laporan yang selesai untuk unit ini."
                : "Belum ada laporan yang pernah ditangani unit ini."}
            </div>
          ) : (
            paginatedData.map((item) => {
              const badge = statusBadge(item);
              return (
                <div key={item.id_boxing} className="border-t-2 border-black p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-gray-600">{item.kode_laporan}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${badge.cls}`}>
                      <badge.Icon size={10} />
                      {badge.label}
                    </span>
                  </div>
                  <div className="border border-gray-300 p-2 text-[11px] bg-gray-50 rounded max-h-20 overflow-auto leading-relaxed text-justify whitespace-pre-wrap break-words">
                    {item.isi_laporan}
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Rencana Tindakan</p>
                    <div className="border border-gray-200 p-1.5 rounded">
                      <RencanaList rencana={item.rencana_tindakan} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Hasil Tindak Lanjut</p>
                    <div className="border border-gray-200 p-2 text-[10px] text-gray-600 rounded max-h-16 leading-relaxed text-justify whitespace-pre-wrap break-words">
                      {isHasilTerselesaikan(item) ? (
                        <span className="italic text-gray-400">Sudah Terselesaikan</span>
                      ) : (
                        hasilTindakLanjutText(item)
                      )}
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1 inline-flex items-center gap-1">
                      <Calendar size={10} /> {fmtTglSingkat(item.tanggal_pelaksanaan)}
                    </p>
                    {item.lampiran_hasil && (
                      <button type="button" onClick={() => setSelectedImage(getImageUrl(item.lampiran_hasil))}
                        className="mt-1 flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                        <ImageIcon size={11} /> Lihat Gambar
                      </button>
                    )}
                  </div>
                  <button type="button" onClick={() => handleExportPDF(item)} disabled={exportingId === item.id_boxing}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[11px] font-bold rounded">
                    {exportingId === item.id_boxing
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><FileText size={12} /> Export PDF</>}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* PAGINATION */}
        {filteredData.length > ITEMS_PER_PAGE && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3">
            <p className="text-[10px] text-gray-500">
              Menampilkan{" "}
              <span className="font-semibold text-gray-700">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>
              {" - "}
              <span className="font-semibold text-gray-700">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span>
              {" dari "}
              <span className="font-semibold text-gray-700">{filteredData.length}</span>
              {" laporan"}
            </p>

            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 text-[10px] font-semibold rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1">
                <ChevronLeft size={12} /> Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  return Math.abs(page - currentPage) <= 1;
                })
                .map((page, index, pages) => {
                  const previousPage = pages[index - 1];
                  return (
                    <div key={page} className="flex items-center gap-1">
                      {previousPage && page - previousPage > 1 && (
                        <span className="px-1 text-gray-400 text-[10px]">...</span>
                      )}
                      <button onClick={() => setCurrentPage(page)}
                        className={`min-w-8 px-2.5 py-1.5 text-[10px] font-semibold rounded border transition-all ${
                          currentPage === page
                            ? "bg-dark-header text-white border-dark-header"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                        }`}>
                        {page}
                      </button>
                    </div>
                  );
                })}

              <button onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 text-[10px] font-semibold rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1">
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}