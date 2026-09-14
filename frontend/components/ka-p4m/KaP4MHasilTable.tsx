"use client";
// FILE: frontend/components/ka-p4m/KaP4MHasilTable.tsx
// ============================================================
// ✅ FITUR DIKEMBALIKAN KE STAF P4M: keputusan "Siap" (→ laporan
// otomatis Selesai) atau "Belum Siap" (→ balik ke Kepala Unit untuk
// revisi hasil) atas hasil tindak lanjut unit sempat dipindah ke sini
// (Ka P4M), tapi sekarang dikembalikan lagi jadi wewenang Staf P4M
// sepenuhnya (lihat ProcessMonitorTable.tsx, bagian "KEPUTUSAN STAFF" —
// endpoint PATCH /staf/approval-hasil). Ka P4M sekarang HANYA memantau
// (read-only) di sini — tidak ada lagi tombol centang/silang.
// ============================================================
import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { kaP4MApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";
import { PeriodFilterBar, isInPeriodFilter, labelPeriodFilter, type FilterMode } from "@/components/shared/PeriodFilterBar";
import { toLocalDate, fmtTgl as fmtTglShared } from "@/lib/exportHelpers";
import {
  Clock,
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  Calendar,
  Wrench,
  ClipboardCheck,
  Building2,
} from "lucide-react";

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
  tanggal_keputusan_ka?: string | null;
  created_at?: string | null;
}

type LucideIcon = typeof Clock;

export default function KaP4MHasilTable() {
  const [data, setData] = useState<HasilItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("semua");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await kaP4MApi.getProsesMonitor();
      setData(res.data as HasilItem[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredData = useMemo(() => {
    return data.filter((item) =>
      isInPeriodFilter(filterMode, selectedDate, toLocalDate, item.created_at ?? null)
    );
  }, [data, filterMode, selectedDate]);

  const groupedData = useMemo(() => {
    const map = new Map<number, {
      id_laporan: number;
      kode_laporan: string;
      isi_laporan: string | null;
      lampiran_laporan: string | null;
      created_at?: string | null;
      units: HasilItem[];
    }>();
    const order: number[] = [];

    filteredData.forEach((item) => {
      if (!map.has(item.id_laporan)) {
        map.set(item.id_laporan, {
          id_laporan: item.id_laporan,
          kode_laporan: item.kode_laporan,
          isi_laporan: item.isi_laporan,
          lampiran_laporan: item.lampiran_laporan,
          created_at: item.created_at,
          units: [],
        });
        order.push(item.id_laporan);
      }
      map.get(item.id_laporan)!.units.push(item);
    });

    return order.map((id) => map.get(id)!);
  }, [filteredData]);

  const highlightedDates = useMemo(() => {
    return new Set(
      data
        .map((item) => item.created_at)
        .filter((v): v is string => !!v)
        .map((v) => {
          const d = toLocalDate(v);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        })
    );
  }, [data]);

  function getStageInfo(item: HasilItem): { label: string; cls: string; Icon: LucideIcon } {
    switch (item.status_boxing) {
      case "terdistribusi":
        return {
          label: "Menunggu Kepala Unit isi Penyebab & Rencana",
          cls: "text-gray-500 bg-gray-50 border-gray-300",
          Icon: Clock,
        };
      case "diproses":
        return {
          label: "Menunggu keputusan Anda (Proses Pengaduan)",
          cls: "text-blue-600 bg-blue-50 border-blue-300",
          Icon: ClipboardCheck,
        };
      case "menunggu_pelaksanaan":
        return {
          label: "Menunggu Kepala Unit isi Hasil Tindak Lanjut",
          cls: "text-amber-600 bg-amber-50 border-amber-300",
          Icon: Wrench,
        };
      case "di_staff":
        return {
          label: "Menunggu Keputusan Staf P4M",
          cls: "text-blue-600 bg-blue-50 border-blue-300",
          Icon: Clock,
        };
      default:
        return {
          label: "Menunggu diproses",
          cls: "text-gray-500 bg-gray-50 border-gray-300",
          Icon: Clock,
        };
    }
  }

  function getImageUrl(lampiran: string | null): string {
    if (!lampiran) return "";
    if (lampiran.startsWith("http")) return lampiran;
    if (lampiran.startsWith("uploads/")) return `${BASE_URL}/${lampiran}`;
    return `${BASE_URL}/uploads/${lampiran}`;
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
        <div className="w-6 h-6 border-4 border-blue-polibatam border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs">Memuat data hasil tindak lanjut...</p>
      </div>
    );
  }

  return (
    <>
      {selectedImage && <ImageModal src={selectedImage} onClose={() => setSelectedImage(null)} />}

      {/* FILTER PERIODE */}
      <div className="mb-3">
        <PeriodFilterBar
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          highlightedDates={highlightedDates}
          showCalendar={false}
        />
        <p className="mt-2 text-[10px] text-gray-400 font-bold uppercase">
          {filteredData.length} laporan · {labelPeriodFilter(filterMode, selectedDate, fmtTglShared)}
        </p>
      </div>

      <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
        <p className="text-[10px] text-gray-500 px-3 py-2 bg-gray-50 border-b">
          Ka P4M: mode pantau. Keputusan Siap / Belum Siap atas hasil tindak lanjut unit sekarang wewenang Staf P4M (tab &ldquo;Proses &amp; Pantau&rdquo;).
        </p>
        {error && <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b">{error}</p>}

        <table className="w-full border-collapse text-[10px]" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "40%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "16%" }} />
          </colgroup>
          <thead>
            <tr className="font-bold uppercase bg-gray-50 text-center">
              <th className="border-r-2 border-b-2 border-black p-3">Laporan</th>
              <th className="border-r-2 border-b-2 border-black p-3">Rencana / Aksi Masukan</th>
              <th className="border-r-2 border-b-2 border-black p-3">Hasil Tindak Lanjut Unit</th>
              <th className="border-b-2 border-black p-3">Status Keputusan Staff</th>
            </tr>
          </thead>
          <tbody>
            {groupedData.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-12 text-center">
                  <p className="text-gray-400 italic text-sm">Tidak ada laporan pada periode ini.</p>
                  <p className="text-gray-300 text-xs mt-1">(Semua laporan, apa pun tahap dan statusnya, tampil di sini — coba ganti filter periode)</p>
                </td>
              </tr>
            ) : (
              groupedData.map((group) => {
                const rowSpan = group.units.length;
                return (
                  <Fragment key={group.id_laporan}>
                    {group.units.map((item, uIdx) => {
                      const isFirstUnit = uIdx === 0;
                      const isLastUnit = uIdx === rowSpan - 1;
                      const stage = getStageInfo(item);
                      const StageIcon = stage.Icon;

                      return (
                        <tr key={item.id_boxing}>
                          {/* Kolom Laporan — align-TOP, konten laporan utama di atas */}
                          {isFirstUnit && (
                            <td
                              rowSpan={rowSpan}
                              className="border-r-2 border-b-2 border-black p-3 align-top"
                            >
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    {group.kode_laporan}
                                  </span>
                                  {rowSpan > 1 && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
                                      <Building2 size={10} />
                                      Didistribusikan ke {rowSpan} unit
                                    </span>
                                  )}
                                </div>
                                <div className="border border-gray-400 p-2 min-h-16 text-[10px]">
                                  {group.isi_laporan}
                                </div>
                                <p className="text-[9px] text-gray-400 flex items-center gap-1">
                                  <Calendar size={11} />
                                  {formatTanggal(group.created_at)}
                                </p>
                                {group.lampiran_laporan && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedImage(getImageUrl(group.lampiran_laporan))}
                                    className="flex items-center gap-1 text-[9px] text-blue-600 hover:underline self-start"
                                  >
                                    <ImageIcon size={11} /> Lihat Gambar Awal
                                  </button>
                                )}
                              </div>
                            </td>
                          )}

                          {/* ✅ Rencana / Aksi Masukan — kotak di atas, label unit di BAWAH kotak.
                              Warna label abu-abu bold (bukan biru), biar gak nyakitin mata. */}
                          <td className={`border-r-2 border-black p-3 align-middle ${isLastUnit ? "border-b-2" : "border-b"}`}>
                            <div className="border border-gray-300 p-2 min-h-16 text-[10px] text-gray-600 flex items-center">
                              <span className="w-full">{item.aksi_masukan || item.rencana_tindakan || "—"}</span>
                            </div>
                            {/* Label unit di BAWAH kotak */}
                            <p className="text-[9px] text-gray-500 font-bold mt-1.5 flex items-center gap-1">
                              <Building2 size={10} className="shrink-0" />
                              {item.nama_unit || "—"}
                              {rowSpan > 1 && (
                                <span className="text-gray-400 font-normal">
                                  · Unit {uIdx + 1}/{rowSpan}
                                </span>
                              )}
                            </p>
                          </td>

                          {/* ✅ Hasil Tindak Lanjut Unit — TANPA label unit (udah ada di kolom Rencana) */}
                          <td className={`border-r-2 border-black p-3 align-middle ${isLastUnit ? "border-b-2" : "border-b"}`}>
                            <div className="border border-gray-300 min-h-16 p-2 text-[10px] flex items-center">
                              <span className="w-full">
                                {item.hasil_tindakan ? (
                                  item.hasil_tindakan
                                ) : item.approval_staf === "diterima" ? (
                                  <span className="text-green-600 italic font-semibold">Selesai</span>
                                ) : (
                                  <span className="text-gray-400 italic">Belum diisi Kepala Unit</span>
                                )}
                              </span>
                            </div>
                            {item.tanggal_pelaksanaan && (
                              <p className="text-[9px] text-gray-400 flex items-center gap-1 mt-1.5">
                                <Calendar size={11} />
                                {formatTanggal(item.tanggal_pelaksanaan)}
                              </p>
                            )}
                            {item.lampiran_hasil && (
                              <button
                                type="button"
                                onClick={() => setSelectedImage(getImageUrl(item.lampiran_hasil))}
                                className="flex items-center gap-1 text-[9px] text-blue-600 hover:underline self-start mt-1"
                              >
                                <ImageIcon size={11} /> Lihat Gambar
                              </button>
                            )}
                          </td>

                          {/* Status Keputusan Staff — align-middle */}
                          <td className={`p-3 align-middle text-center ${isLastUnit ? "border-b-2" : "border-b"}`}>
                            {item.approval_staf && item.approval_staf !== "menunggu" ? (
                              <div className="flex flex-col items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border ${
                                    item.approval_staf === "diterima"
                                      ? "text-green-700 bg-green-50 border-green-300"
                                      : "text-red-700 bg-red-50 border-red-300"
                                  }`}
                                >
                                  {item.approval_staf === "diterima" ? (
                                    <>
                                      <CheckCircle2 size={12} /> Siap — Selesai
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw size={12} /> Belum Siap
                                    </>
                                  )}
                                </span>
                                <p className="text-[9px] text-gray-400 flex items-center gap-1">
                                  <Clock size={10} />
                                  {formatTanggal(item.tanggal_keputusan_ka)}
                                </p>
                                {item.catatan_approval && (
                                  <p className="text-[9px] text-gray-500 italic text-center leading-tight max-w-32">
                                    &ldquo;{item.catatan_approval}&rdquo;
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded border leading-relaxed ${stage.cls}`}
                                title={`Status saat ini: ${item.status_boxing || "-"}`}
                              >
                                <StageIcon size={11} className="shrink-0" />
                                <span className="text-left">{stage.label}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}