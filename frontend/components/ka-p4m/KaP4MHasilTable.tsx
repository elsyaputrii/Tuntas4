"use client";
// FILE: frontend/components/ka-p4m/KaP4MHasilTable.tsx
// ============================================================
// ✅ FITUR DIKEMBALIKAN KE STAF P4M: keputusan "✅ Siap" (→ laporan
// otomatis Selesai) atau "❌ Belum Siap" (→ balik ke Kepala Unit untuk
// revisi hasil) atas hasil tindak lanjut unit sempat dipindah ke sini
// (Ka P4M), tapi sekarang dikembalikan lagi jadi wewenang Staf P4M
// sepenuhnya (lihat ProcessMonitorTable.tsx, bagian "KEPUTUSAN STAFF" —
// endpoint PATCH /staf/approval-hasil). Ka P4M sekarang HANYA memantau
// (read-only) di sini — tidak ada lagi tombol centang/silang.
// ============================================================
import { useState, useEffect, useCallback, useMemo } from "react";
import { kaP4MApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";
import { PeriodFilterBar, isInPeriodFilter, labelPeriodFilter, type FilterMode } from "@/components/shared/PeriodFilterBar";
import { toLocalDate, fmtTgl as fmtTglShared } from "@/lib/exportHelpers";

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
      // ✅ SEMUA laporan ditampilkan di tabel ini, apa pun tahapnya — termasuk
      // yang sudah 'selesai' — supaya Ka P4M bisa memantau riwayat lengkapnya.
      // Difilter berdasarkan periode tanggal lewat PeriodFilterBar, bukan
      // lagi dibuang berdasarkan status. Keputusan ✅ Siap / ❌ Belum Siap
      // sekarang murni informatif di sini — wewenangnya ada di Staf P4M
      // (lihat kolom "Status Keputusan Staff" di bawah).
      setData(res.data as HasilItem[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter periode (Harian/Mingguan/Bulanan/Tahunan/Semua) berdasarkan
  // tanggal laporan masuk (created_at) — sama seperti Laporan Masuk & Proses & Pantau.
  const filteredData = useMemo(() => {
    return data.filter((item) =>
      isInPeriodFilter(filterMode, selectedDate, toLocalDate, item.created_at ?? null)
    );
  }, [data, filterMode, selectedDate]);

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

  // Label & warna untuk tahap-tahap SEBELUM laporan sampai ke keputusan
  // Ka P4M (kolom paling kanan). Sebelumnya semua kondisi ini disamaratakan
  // jadi satu teks "Menunggu tahap Staf P4M" yang salah/menyesatkan — padahal
  // Staf P4M sama sekali tidak punya wewenang keputusan di alur ini (cuma
  // pantau). Sekarang tiap tahap dikasih label yang sesuai kenyataannya.
  function getStageInfo(item: HasilItem): { label: string; cls: string } {
    switch (item.status_boxing) {
      case "terdistribusi":
        return {
          label: "🕓 Menunggu Kepala Unit isi Penyebab & Rencana",
          cls: "text-gray-500 bg-gray-50 border-gray-300",
        };
      case "diproses":
        return {
          label: "🕓 Menunggu keputusan Anda (Proses Pengaduan)",
          cls: "text-blue-600 bg-blue-50 border-blue-300",
        };
      case "menunggu_pelaksanaan":
        return {
          label: "🕓 Menunggu Kepala Unit isi Hasil Tindak Lanjut",
          cls: "text-amber-600 bg-amber-50 border-amber-300",
        };
      case "di_staff":
        // ✅ Hasil sudah diisi Kepala Unit, tinggal menunggu Keputusan
        // Staff (✅ Siap / ❌ Belum Siap) dari Staf P4M sendiri — bukan
        // lagi wewenang Ka P4M.
        return {
          label: "⏳ Menunggu Keputusan Staf P4M",
          cls: "text-blue-600 bg-blue-50 border-blue-300",
        };
      default:
        return {
          label: "🕓 Menunggu diproses",
          cls: "text-gray-500 bg-gray-50 border-gray-300",
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

      {/* ✅ Modal keputusan Siap/Belum Siap sudah dipindah ke
          ProcessMonitorTable.tsx (Staf P4M). Ka P4M di sini read-only,
          jadi tidak ada modal konfirmasi lagi di sisi ini. */}

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
          Ka P4M: mode pantau. Keputusan ✅ Siap / ❌ Belum Siap atas hasil tindak lanjut unit sekarang wewenang Staf P4M (tab &ldquo;Proses &amp; Pantau&rdquo;).
        </p>
        {error && <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b">❌ {error}</p>}

        <div className="flex font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[10px]">
          <div className="flex-1 border-r-2 border-black p-3">Laporan</div>
          <div className="w-[20%] border-r-2 border-black p-3">Rencana / Aksi Masukan</div>
          <div className="w-[24%] border-r-2 border-black p-3">Hasil Tindak Lanjut Unit</div>
          <div className="w-[16%] p-3">Status Keputusan Staff</div>
        </div>

        {filteredData.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 italic text-sm">Tidak ada laporan pada periode ini.</p>
            <p className="text-gray-300 text-xs mt-1">(Semua laporan, apa pun tahap dan statusnya, tampil di sini — coba ganti filter periode)</p>
          </div>
        ) : (
          filteredData.map((item) => (
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
                  {item.hasil_tindakan ? (
                    item.hasil_tindakan
                  ) : item.approval_staf === "diterima" ? (
                    <span className="text-green-600 italic font-semibold">
                      Selesai
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">
                      Belum diisi Kepala Unit
                    </span>
                  )}
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
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded border text-center ${
                        item.approval_staf === "diterima"
                          ? "text-green-700 bg-green-50 border-green-300"
                          : "text-red-700 bg-red-50 border-red-300"
                      }`}
                    >
                      {item.approval_staf === "diterima" ? "✅ Siap — Selesai" : "❌ Belum Siap"}
                    </span>
                    {/* ✅ Bukti tanggal keputusan Staf P4M (dari boxing.updated_at) */}
                    <p className="text-[9px] text-gray-400 text-center leading-tight">
                      🕒 {formatTanggal(item.tanggal_keputusan_ka)}
                    </p>
                    {item.catatan_approval && (
                      <p className="text-[9px] text-gray-500 italic text-center leading-tight max-w-32 mt-0.5">
                        &ldquo;{item.catatan_approval}&rdquo;
                      </p>
                    )}
                  </div>
                ) : (
                  // ✅ Ka P4M tidak lagi bisa memutuskan di sini — tombol
                  // centang/silang sudah dicabut. Setiap tahap (termasuk
                  // "di_staff, belum diputuskan") ditampilkan dengan label
                  // yang sesuai lewat getStageInfo — keputusan ✅ Siap / ❌
                  // Belum Siap hanya bisa diambil Staf P4M lewat tab
                  // "Proses & Pantau" miliknya.
                  <span
                    className={`text-[9px] font-bold px-2 py-1 rounded border text-center leading-relaxed ${getStageInfo(item).cls}`}
                    title={`Status saat ini: ${item.status_boxing || "-"}`}
                  >
                    {getStageInfo(item).label}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}