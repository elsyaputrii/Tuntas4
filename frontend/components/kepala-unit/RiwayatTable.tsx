// FILE: frontend/components/kepala-unit/RiwayatTable.tsx
// Tab "Riwayat" — rekapitulasi SEMUA laporan yang pernah didistribusikan/
// ditangani Kepala Unit ini (apa pun tahapnya sekarang), lengkap dengan
// penanda status yang sebenarnya dan tombol export PDF (TTD QR code) per
// laporan, mirror dari fitur "Proses & Pantau" milik Staf P4M.
"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { kepalaUnitApi } from "@/lib/api";
import { exportPDFRiwayatKepalaUnit } from "@/lib/exportPdf";

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

// ✅ FIX: sebelumnya SETIAP baris di tabel ini selalu ditandai "✓ Selesai"
// secara hardcode — itu cocok SELAMA query backend cuma pernah
// mengembalikan laporan yang benar-benar selesai (akibat INNER JOIN yang
// jadi bug di getRiwayat). Sekarang backend mengembalikan SEMUA laporan
// yang pernah ditangani unit ini (apa pun tahapnya), jadi badge status
// per baris harus benar-benar mencerminkan tahap sebenarnya, bukan
// selalu "Selesai".
function statusBadge(item: RiwayatItem): { label: string; cls: string } {
  if (item.status_boxing === "selesai") {
    return { label: "✓ Selesai", cls: "bg-green-100 text-green-700" };
  }
  if (item.status_boxing === "di_staff") {
    if (item.approval_staf === "ditolak") {
      return { label: "🔄 Perbaikan Berkelanjutan", cls: "bg-red-100 text-red-700" };
    }
    return { label: "⏳ Menunggu Keputusan Ka P4M", cls: "bg-amber-100 text-amber-700" };
  }
  if (item.status_boxing === "menunggu_pelaksanaan") {
    return { label: "🔧 Menunggu Pelaksanaan", cls: "bg-blue-100 text-blue-700" };
  }
  if (item.status_review === "menunggu_keputusan_ka") {
    return { label: "⏳ Menunggu Ka P4M", cls: "bg-amber-100 text-amber-700" };
  }
  return { label: "🔄 Diproses", cls: "bg-blue-100 text-blue-700" };
}

function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative" style={{ width: "85vw", maxWidth: "1100px" }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white text-3xl font-bold hover:text-gray-300 z-10">✕</button>
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
              msg.innerText = "❌ Gambar tidak ditemukan.\nURL: " + src;
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
  // ✅ FIX: statistik sekarang diambil langsung dari backend (single
  // source of truth — dihitung dari SEMUA laporan yang pernah
  // didistribusikan/ditangani unit ini), bukan di-derive ulang di
  // frontend dari `data` yang sebelumnya sudah salah/kepotong akibat
  // bug INNER JOIN di getRiwayat.
  const [stats, setStats] = useState<RiwayatStats>({ total: 0, selesai: 0, persentase: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("semua");
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await kepalaUnitApi.getRiwayat();
      const items: RiwayatItem[] = res.data ?? [];
      setData(items);
      // Fallback dihitung dari `items` kalau backend lama belum mengirim
      // `stats` (mis. saat rolling deploy) — supaya tetap tampil benar.
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

  // ✅ FIX: filter "Selesai" tetap murni status_boxing === 'selesai' —
  // laporan yang masih berjalan (menunggu Ka P4M, di unit, dsb) TIDAK
  // ikut dihitung/ditampilkan sebagai selesai.
  const filteredData = useMemo(
    () => data.filter((d) => (filterMode === "selesai" ? d.status_boxing === "selesai" : true)),
    [data, filterMode]
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

  return (
    <>
      {selectedImage && <ImageModal src={selectedImage} onClose={() => setSelectedImage(null)} />}

      <div className="w-full space-y-4">
        {/* Ringkasan rekap "selesai mengerjakan" */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border-2 border-black bg-white p-3 text-center">
            <p className="text-[9px] uppercase font-bold text-gray-400">Total Laporan</p>
            <p className="text-xl font-black text-gray-800">{stats.total}</p>
          </div>
          <div className="border-2 border-black bg-green-50 p-3 text-center">
            <p className="text-[9px] uppercase font-bold text-green-600">✓ Selesai</p>
            <p className="text-xl font-black text-green-700">{stats.selesai}</p>
          </div>
          <div className="border-2 border-black bg-blue-50 p-3 text-center">
            <p className="text-[9px] uppercase font-bold text-blue-600">Persentase Selesai</p>
            <p className="text-xl font-black text-blue-700">{stats.persentase}%</p>
          </div>
        </div>

        {/* Filter pill */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(["semua", "selesai"] as FilterMode[]).map((mode) => (
            <button key={mode} onClick={() => setFilterMode(mode)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all
                ${filterMode === mode ? "bg-dark-header text-white border-dark-header shadow" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
              {mode === "semua" ? "📋 Semua" : "✓ Selesai"}
            </button>
          ))}
          <span className="text-[9px] text-gray-400 ml-auto italic hidden sm:flex items-center">
            {filteredData.length} laporan
          </span>
        </div>

        {/* Tabel — DESKTOP */}
        <div className="hidden md:block w-full border-2 border-black bg-white overflow-x-auto text-xs">
          <div className="flex min-w-175 font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[10px]">
            <div className="w-24 border-r-2 border-black p-2">Kode</div>
            <div className="flex-1 border-r-2 border-black p-2">Uraian Ketidaksesuaian</div>
            <div className="w-40 border-r-2 border-black p-2">Rencana Tindakan</div>
            <div className="flex-1 border-r-2 border-black p-2">Hasil Tindak Lanjut</div>
            <div className="w-32 border-r-2 border-black p-2">Status</div>
            <div className="w-24 p-2">PDF</div>
          </div>
          {filteredData.length === 0 ? (
            <div className="flex p-10 justify-center border-t-2 border-black">
              <p className="text-gray-400 italic text-sm">
                {filterMode === "selesai"
                  ? "Belum ada laporan yang selesai untuk unit ini."
                  : "Belum ada laporan yang pernah ditangani unit ini."}
              </p>
            </div>
          ) : (
            filteredData.map((item) => {
              const badge = statusBadge(item);
              return (
              <div key={item.id_boxing} className="flex min-w-175 border-t-2 border-black text-[11px]">
                <div className="w-24 border-r-2 border-black p-3 align-top">
                  <p className="font-bold text-[10px]">{item.kode_laporan}</p>
                  <p className="text-[9px] text-gray-400 mt-1">📅 {fmtTglSingkat(item.tanggal_laporan)}</p>
                </div>
                <div className="flex-1 border-r-2 border-black p-3">
                  <div className="border border-gray-400 p-2 h-16 overflow-auto">{item.isi_laporan}</div>
                </div>
                <div className="w-40 border-r-2 border-black p-3">
                  <p className="italic text-gray-500 text-[10px] overflow-auto max-h-16">{item.rencana_tindakan ?? "—"}</p>
                </div>
                <div className="flex-1 border-r-2 border-black p-3">
                  <div className="border border-gray-300 p-2 h-16 overflow-auto">
                    {item.hasil_tindakan ?? "—"}
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">📅 {fmtTglSingkat(item.tanggal_pelaksanaan)}</p>
                  {item.lampiran_hasil && (
                    <button type="button" onClick={() => setSelectedImage(getImageUrl(item.lampiran_hasil))}
                      className="mt-1 flex items-center gap-1 text-[9px] text-blue-600 hover:underline">
                      🖼️ Lihat Gambar
                    </button>
                  )}
                </div>
                <div className="w-32 border-r-2 border-black p-3 flex items-center justify-center">
                  <span className={`text-[9px] font-bold text-center px-2 py-1 rounded leading-tight ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="w-24 p-2 flex items-center justify-center">
                  <button type="button" onClick={() => handleExportPDF(item)} disabled={exportingId === item.id_boxing}
                    className="flex flex-col items-center gap-0.5 px-2 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[8px] font-bold rounded w-full">
                    {exportingId === item.id_boxing
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><span className="text-sm leading-none">📄</span><span>PDF</span></>}
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
              {filterMode === "selesai"
                ? "Belum ada laporan yang selesai untuk unit ini."
                : "Belum ada laporan yang pernah ditangani unit ini."}
            </div>
          ) : (
            filteredData.map((item) => {
              const badge = statusBadge(item);
              return (
              <div key={item.id_boxing} className="border-t-2 border-black p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-600">{item.kode_laporan}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="border border-gray-300 p-2 text-[11px] bg-gray-50 rounded max-h-20 overflow-auto">
                  {item.isi_laporan}
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Rencana Tindakan</p>
                  <p className="text-[10px] italic text-gray-600 border border-gray-200 p-1.5 rounded">{item.rencana_tindakan ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Hasil Tindak Lanjut</p>
                  <div className="border border-gray-200 p-2 text-[10px] text-gray-600 rounded max-h-16 overflow-auto">
                    {item.hasil_tindakan ?? "—"}
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">📅 {fmtTglSingkat(item.tanggal_pelaksanaan)}</p>
                  {item.lampiran_hasil && (
                    <button type="button" onClick={() => setSelectedImage(getImageUrl(item.lampiran_hasil))}
                      className="mt-1 flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                      🖼️ Lihat Gambar
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => handleExportPDF(item)} disabled={exportingId === item.id_boxing}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[11px] font-bold rounded">
                  {exportingId === item.id_boxing
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <>📄 Export PDF</>}
                </button>
              </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}