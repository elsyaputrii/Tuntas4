"use client";
// FILE: frontend/components/staff-p4m/tables/ProcessMonitorTable.tsx

import { useState, useEffect, useMemo } from "react";
import { stafApi, authApi, userApi } from "@/lib/api";
import { exportPDFProses } from "@/lib/exportPdf";
import { PeriodFilterBar, isInPeriodFilter, labelPeriodFilter, type FilterMode } from "@/components/shared/PeriodFilterBar";
import { toLocalDate, fmtTgl } from "@/lib/exportHelpers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative" style={{ width: "85vw", maxWidth: "1100px" }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white text-3xl font-bold hover:text-gray-300 z-10">✕</button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Bukti lampiran"
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

interface ProsesItem {
  id_laporan: number;
  kode_laporan: string;
  id_boxing: number;
  jenis_laporan: string | null;
  isi_laporan: string | null;
  lampiran_laporan: string | null;
  status_laporan: string | null;
  nama_unit: string | null;
  status_boxing: string | null;
  status_review: string | null;
  aksi_masukan: string | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  catatan_kepala: string | null;
  hasil_tindakan: string | null;
  lampiran_hasil: string | null;
  tanggal_pelaksanaan: string | null;
  approval_staf: string | null;
  catatan_approval: string | null;
  created_at?: string | null;
}

// ✅ STATUS KEPUTUSAN KA — dipakai buat kolom "Keputusan Ka" di
// Proses & Pantau. Ini murni soal keputusan Ka P4M atas RENCANA
// (rancangan_tindakan.status_review), bukan soal keputusan akhir atas
// HASIL (approval_staf, itu beda kolom/tahap).
const reviewBadge: Record<string, { label: string; cls: string }> = {
  menunggu_keputusan_ka: { label: "⏳ Menunggu Review", cls: "text-blue-600 bg-blue-50 border-blue-200" },
  ditindaklanjuti:       { label: "🔄 Perbaikan Berkelanjutan", cls: "text-red-600 bg-red-50 border-red-200" },
  tidak_ditindaklanjuti: { label: "✅ Sesuai", cls: "text-green-600 bg-green-50 border-green-200" },
};

// ✅ FIX: sebelumnya kalau status_review masih NULL (laporan baru
// terdistribusi, Kepala Unit belum isi rencana sama sekali), badge ini
// gak muncul apa-apa alias kolom "Keputusan Ka" keliatan kosong —
// padahal statusnya jelas: Ka P4M memang belum ada apa-apa buat
// direview. Sekarang selalu fallback ke "⏳ Menunggu Review" biar
// kolomnya gak pernah blank.
function getKeputusanKaBadge(item: ProsesItem): { label: string; cls: string } {
  if (item.status_review && reviewBadge[item.status_review]) {
    return reviewBadge[item.status_review];
  }
  return reviewBadge.menunggu_keputusan_ka;
}

const boxingLabel: Record<string, string> = {
  terdistribusi: "Terdistribusi",
  diproses: "Diproses",
  menunggu_pelaksanaan: "Menunggu unit",
  di_staff: "Di Staf P4M",
  selesai: "Selesai",
};

export default function ProcessMonitorTable() {
  const [data, setData] = useState<ProsesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msgOk, setMsgOk] = useState("");
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [meSignature, setMeSignature] = useState<{ nama: string | null; tandaTangan: string | null } | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("semua");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // ✅ KEPUTUSAN STAFF: state modal konfirmasi ✅ Siap / ❌ Belum Siap.
  // Keputusan ini dikembalikan jadi wewenang Staf P4M (bukan lagi Ka
  // P4M / Kepala Unit) — lihat stafApi.setApprovalHasil di lib/api.ts.
  const [modal, setModal] = useState<{
    open: boolean;
    id_boxing: number | null;
    keputusan: "diterima" | "ditolak" | null;
    catatan: string;
  }>({ open: false, id_boxing: null, keputusan: null, catatan: "" });
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    // Ambil TTD digital Staf P4M yang sedang login, buat ditempel di PDF
    // "Proses & Pantau" (bukan TTD Kepala P4M — beda dari PDF Rekapitulasi).
    (async () => {
      try {
        const me = await authApi.getMe();
        const users = await userApi.getUsers();
        const myAccount = users.find(
          (u: { id: number; name: string; tandaTangan?: string | null }) => u.id === me.data?.id
        );
        if (myAccount) {
          setMeSignature({ nama: myAccount.name, tandaTangan: myAccount.tandaTangan ?? null });
        }
      } catch {
        /* nonfatal — PDF tetap bisa dicetak tanpa TTD */
      }
    })();
  }, []);

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

  function getImageUrl(lampiran: string | null): string {
    if (!lampiran) return "";
    if (lampiran.startsWith("http")) return lampiran;
    if (lampiran.startsWith("uploads/")) return `${BASE_URL}/${lampiran}`;
    return `${BASE_URL}/uploads/${lampiran}`;
  }

  async function handleExportPDF(item: ProsesItem) {
    setExportingId(item.id_boxing);
    await exportPDFProses({
      kode_laporan: item.kode_laporan,
      jenis_laporan: item.jenis_laporan,
      isi_laporan: item.isi_laporan,
      nama_unit: item.nama_unit,
      status_boxing: item.status_boxing,
      status_review: item.status_review,
      approval_staf: item.approval_staf,
      aksi_masukan: item.aksi_masukan,
      penyebab: item.penyebab,
      rencana_tindakan: item.rencana_tindakan,
      hasil_tindakan: item.hasil_tindakan,
      lampiran_hasil: item.lampiran_hasil,
      tanggal_pelaksanaan: item.tanggal_pelaksanaan,
      created_at: item.created_at,
    }, meSignature);
    setExportingId(null);
  }

  // ✅ KEPUTUSAN STAFF: Staf P4M yang memutuskan ✅ Siap / ❌ Belum Siap
  // atas hasil tindak lanjut unit (dulu wewenang ini dipindah ke Ka
  // P4M, sekarang dikembalikan lagi ke sini). Kalau sudah diputuskan,
  // tampilkan badge status; kalau belum, tampilkan tombol keputusan.
  function openModal(item: ProsesItem, keputusan: "diterima" | "ditolak") {
    if (item.status_boxing !== "di_staff") {
      setError(
        `Laporan ini belum bisa diputuskan — status saat ini masih "${item.status_boxing || "tidak diketahui"}", belum sampai tahap Staf P4M (di_staff).`
      );
      return;
    }
    if (!item.hasil_tindakan) {
      setError("Hasil tindak lanjut belum diisi Kepala Unit.");
      return;
    }
    setModal({ open: true, id_boxing: item.id_boxing, keputusan, catatan: "" });
    setError("");
  }

  async function handleSubmitKeputusan() {
    const { id_boxing, keputusan, catatan } = modal;
    if (!id_boxing || !keputusan) return;
    if (!catatan.trim()) {
      setError("Catatan / alasan wajib diisi!");
      return;
    }
    setSubmittingId(id_boxing);
    setError("");
    try {
      const res = await stafApi.setApprovalHasil(id_boxing, keputusan, catatan.trim());
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

  function renderKeputusanStaf(item: ProsesItem) {
    if (item.status_boxing !== "di_staff" && item.status_boxing !== "selesai") {
      return <span className="text-[9px] text-gray-400 italic text-center">Menunggu tahap sebelumnya</span>;
    }
    if (!item.hasil_tindakan) {
      return <span className="text-[9px] text-gray-400 italic text-center">Menunggu hasil unit</span>;
    }

    const apprVal = item.approval_staf && item.approval_staf !== "menunggu" ? item.approval_staf : null;

    if (apprVal) {
      return (
        <div className="flex flex-col items-center gap-1">
          <span className={`text-[10px] font-bold px-2 py-1 rounded border text-center ${
            apprVal === "diterima" ? "text-green-700 bg-green-50 border-green-300" : "text-red-700 bg-red-50 border-red-300"
          }`}>
            {apprVal === "diterima" ? "✅ Siap — Selesai" : "❌ Belum Siap"}
          </span>
          {item.catatan_approval && (
            <p className="text-[9px] text-gray-500 italic text-center max-w-55">
              {item.catatan_approval}
            </p>
          )}
        </div>
      );
    }

    // Belum diputuskan — hanya bisa diputuskan kalau status_boxing
    // sudah 'di_staff' (item 'selesai' mestinya sudah punya apprVal).
    if (item.status_boxing !== "di_staff") {
      return <span className="text-[9px] text-gray-400 italic text-center">—</span>;
    }

    return (
      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={() => openModal(item, "diterima")}
          title="Siap — laporan otomatis Selesai"
          className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-600 text-white text-base font-bold flex items-center justify-center shadow"
        >
          ✅
        </button>
        <button
          type="button"
          onClick={() => openModal(item, "ditolak")}
          title="Belum Siap — kembalikan ke unit untuk revisi hasil"
          className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white text-base font-bold flex items-center justify-center shadow"
        >
          ❌
        </button>
      </div>
    );
  }

  function formatTanggal(dateStr: string | null | undefined) {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  }

  const filteredData = useMemo(
    () => data.filter((d) => isInPeriodFilter(filterMode, selectedDate, toLocalDate, d.created_at ?? null)),
    [data, filterMode, selectedDate]
  );

  const highlightedDates = useMemo(() => {
    return new Set(
      data
        .filter((d) => d.created_at)
        .map((d) => {
          const dt = toLocalDate(d.created_at as string);
          return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        })
    );
  }, [data]);

  const aktif = filteredData.filter((d) => d.status_boxing !== "selesai");
  const selesai = filteredData.filter((d) => d.status_boxing === "selesai");

  function renderCard(item: ProsesItem) {
    const rev = getKeputusanKaBadge(item);
    const diStaff = item.status_boxing === "di_staff";
    const isSelesai = item.status_boxing === "selesai";

    return (
      <div key={`${item.id_laporan}-${item.id_boxing}`} className="border-t-2 border-black p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-gray-700">{item.kode_laporan}</span>
            <span className="text-[10px] text-gray-400 ml-2">{item.nama_unit}</span>
            <div className="text-[10px] text-gray-400 mt-0.5 italic">
              {boxingLabel[item.status_boxing ?? ""] ?? item.status_boxing}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {rev && <span className={`text-[9px] font-bold px-1.5 py-0.5 border rounded ${rev.cls}`}>{rev.label}</span>}
            <button type="button" onClick={() => handleExportPDF(item)} disabled={exportingId === item.id_boxing}
              className="flex items-center gap-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[9px] font-bold rounded">
              {exportingId === item.id_boxing ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "📄 PDF"}
            </button>
          </div>
        </div>

        <div>
          <div className="border border-gray-300 p-2 text-xs text-gray-700 max-h-20 overflow-auto bg-gray-50">
            {item.isi_laporan}
          </div>
          <p className="text-[9px] text-gray-400 mt-1">
            📅 Tanggal Masuk: {formatTanggal(item.created_at)}
          </p>
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

        {item.aksi_masukan && (
          <p className="text-[10px] text-gray-500 italic border-l-2 border-blue-300 pl-2">{item.aksi_masukan}</p>
        )}

        {item.hasil_tindakan && (
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Hasil Unit:</p>
            <div className="border border-gray-300 p-2 text-xs text-gray-700 max-h-14 overflow-auto">{item.hasil_tindakan}</div>
            {item.tanggal_pelaksanaan && (
              <p className="text-[9px] text-gray-400 mt-1">
                📅 {new Date(item.tanggal_pelaksanaan).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            )}
            {item.lampiran_hasil && (
              <button type="button" onClick={() => setSelectedImage(getImageUrl(item.lampiran_hasil))}
                className="mt-1 flex items-center gap-1 text-[9px] text-blue-600 hover:underline">
                🖼️ Lihat Gambar
              </button>
            )}
          </div>
        )}

        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Keputusan Staff:</p>
          <div className="flex flex-wrap gap-2">
            {diStaff || isSelesai ? (
              <div className="w-full flex justify-center">
                {renderKeputusanStaf(item)}
              </div>
            ) : (
              <span className="text-[10px] text-gray-400 italic">Menunggu tahap sebelumnya</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="w-full border-2 border-black bg-white p-10 text-center text-sm text-gray-400 italic">Memuat data…</div>
  );

  return (
    <>
      {/* ── IMAGE MODAL ── */}
      {selectedImage && <ImageModal src={selectedImage} onClose={() => setSelectedImage(null)} />}

      {/* ── MODAL KEPUTUSAN STAFF (✅ Siap / ❌ Belum Siap) ── */}
      {modal.open && modal.id_boxing && modal.keputusan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-sm uppercase border-b-2 border-black pb-2 mb-3">
              {modal.keputusan === "diterima" ? "✅ selesai" : "❌ ditindak lanjutin"} — Konfirmasi
            </h3>
            <p className="text-[11px] text-gray-500 mb-3">
              ID Boxing: <strong>{modal.id_boxing}</strong>
            </p>
            <div
              className={`mb-4 p-3 border-2 text-[11px] font-bold leading-relaxed ${
                modal.keputusan === "diterima"
                  ? "border-green-500 bg-green-50 text-green-800"
                  : "border-red-500 bg-red-50 text-red-800"
              }`}
            >
              {modal.keputusan === "diterima" ? (
                <>⚠️ Yakin mau tandai SIAP? Laporan ini akan langsung ditandai <u>SELESAI</u> dan masuk Rekapitulasi. Tindakan ini tidak bisa dibatalkan setelah dikirim.</>
              ) : (
                <>⚠️ Yakin mau tandai BELUM SIAP? Laporan ini akan dikembalikan ke Kepala Unit untuk direvisi (hasil pelaksanaan lama akan dihapus).</>
              )}
            </div>

            <div className="mb-4">
              <label className="text-[11px] font-bold uppercase block mb-1">
                Catatan / Alasan <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-black p-2 text-xs h-24 outline-none resize-none"
                placeholder={
                  modal.keputusan === "diterima"
                    ? "Tuliskan alasan menyatakan hasil ini siap..."
                    : "Tuliskan alasan menyatakan hasil ini belum siap (wajib untuk revisi)..."
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
                onClick={handleSubmitKeputusan}
                disabled={submittingId === modal.id_boxing}
                className={`px-6 py-2 text-white text-[11px] font-bold disabled:opacity-50 ${
                  modal.keputusan === "diterima" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submittingId === modal.id_boxing
                  ? "Menyimpan..."
                  : modal.keputusan === "diterima"
                  ? "Ya, Tandai Siap & Selesaikan"
                  : "Ya, Tandai Belum Siap & Kirim ke Unit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER PERIODE ── */}
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
          {filteredData.length} laporan · {labelPeriodFilter(filterMode, selectedDate, fmtTgl)}
        </p>
      </div>

      <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
        <p className="text-[10px] text-gray-500 px-3 py-2 bg-gray-50 border-b">
          Staf P4M: pantau proses &amp; berikan Keputusan Staff — ✅ Siap (laporan otomatis Selesai) atau ❌ Belum Siap (balik ke Kepala Unit untuk revisi hasil). Klik 📄 untuk export PDF.
        </p>
        {msgOk && <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b">{msgOk}</p>}
        {!modal.open && error && <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b">❌ {error}</p>}

        {/* ── DESKTOP ── */}
        <div className="hidden lg:block">
          <div
            className="min-w-215 font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[10px]"
            style={{ display: "table", tableLayout: "fixed", width: "100%" }}
          >
            <div style={{ display: "table-row" }}>
              <div style={{ display: "table-cell", width: "40%" }} className="border-r-2 border-black p-3 align-middle">Laporan</div>
              <div style={{ display: "table-cell", width: "12%" }} className="border-r-2 border-black p-3 align-middle">Keputusan Ka</div>
              <div style={{ display: "table-cell", width: "20%" }} className="border-r-2 border-black p-3 align-middle">Hasil Unit</div>
              <div style={{ display: "table-cell", width: "20%" }} className="border-r-2 border-black p-3 align-middle">Keputusan Staff</div>
              <div style={{ display: "table-cell", width: "8%" }} className="p-2 align-middle">Dokumen</div>
            </div>
          </div>

          {aktif.length === 0 && selesai.length === 0 ? (
            <div className="p-8 text-center text-gray-400 italic min-w-215">Belum ada laporan diproses.</div>
          ) : (
            <>
              {aktif.map((item) => {
                const rev = getKeputusanKaBadge(item);
                return (
                  <div
                    key={`${item.id_laporan}-${item.id_boxing}`}
                    className="min-w-215 border-t-2 border-black"
                    style={{ display: "table", tableLayout: "fixed", width: "100%" }}
                  >
                    <div style={{ display: "table-row" }}>
                      {/* Kolom Laporan + Tanggal + Gambar */}
                      <div style={{ display: "table-cell", width: "40%" }} className="border-r-2 border-black p-3 align-top">
                        <p className="text-[9px] text-gray-400 mb-1 leading-tight">
                          <span className="font-bold">{item.kode_laporan}</span><br />
                          {item.nama_unit} · <span className="italic">{boxingLabel[item.status_boxing ?? ""] ?? item.status_boxing}</span>
                        </p>
                        <div className="border border-gray-400 p-2 h-16 text-[10px] overflow-auto">{item.isi_laporan}</div>
                        <p className="text-[9px] text-gray-400 mt-1">
                          📅 {formatTanggal(item.created_at)}
                        </p>
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

                      <div style={{ display: "table-cell", width: "12%" }} className="border-r-2 border-black p-3 align-top">
                        {rev && <span className={`text-[8px] font-bold px-1 py-1 border rounded text-center inline-block ${rev.cls}`}>{rev.label}</span>}
                        {item.aksi_masukan && <p className="text-[9px] text-gray-500 italic mt-1 line-clamp-2">{item.aksi_masukan}</p>}
                      </div>

                      <div style={{ display: "table-cell", width: "20%" }} className="border-r-2 border-black p-3 align-top">
                        <div className="border border-gray-300 p-2 h-16 text-[10px] overflow-auto">
                          {item.hasil_tindakan || (item.status_review === "tidak_ditindaklanjuti" ? "— (tidak ditindaklanjuti)" : "Belum ada hasil")}
                        </div>
                        {item.tanggal_pelaksanaan && (
                          <p className="text-[9px] text-gray-400 mt-1">
                            📅 {new Date(item.tanggal_pelaksanaan).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        )}
                        {item.lampiran_hasil && (
                          <button type="button" onClick={() => setSelectedImage(getImageUrl(item.lampiran_hasil))}
                            className="mt-1 flex items-center gap-1 text-[9px] text-blue-600 hover:underline">
                            🖼️ Lihat Gambar
                          </button>
                        )}
                      </div>

                      {/* ✅ KEPUTUSAN STAFF: ✅ Siap / ❌ Belum Siap — wewenang
                          Staf P4M (bukan lagi Ka P4M / Kepala Unit). */}
                      <div style={{ display: "table-cell", width: "20%" }} className="border-r-2 border-black p-3 align-top">
                        <div className="flex items-center justify-center h-full">
                          {renderKeputusanStaf(item)}
                        </div>
                      </div>

                      <div style={{ display: "table-cell", width: "8%" }} className="p-2 align-middle">
                        <div className="flex items-center justify-center">
                          <button type="button" onClick={() => handleExportPDF(item)} disabled={exportingId === item.id_boxing}
                            className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[8px] font-bold rounded">
                            {exportingId === item.id_boxing
                              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              : <><span className="text-sm leading-none">📄</span><span>PDF</span></>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {selesai.length > 0 && (
                <>
                  <div className="bg-gray-100 px-3 py-1 text-[10px] font-bold uppercase border-t-2 border-black min-w-215">
                    Sudah selesai
                  </div>
                  {selesai.map((item) => {
                    const rev = getKeputusanKaBadge(item);
                    return (
                      <div
                        key={`${item.id_laporan}-${item.id_boxing}`}
                        className="min-w-215 border-t-2 border-black"
                        style={{ display: "table", tableLayout: "fixed", width: "100%" }}
                      >
                        <div style={{ display: "table-row" }}>
                          <div style={{ display: "table-cell", width: "40%" }} className="border-r-2 border-black p-3 align-top">
                            <p className="text-[9px] text-gray-400 mb-1 leading-tight">
                              <span className="font-bold">{item.kode_laporan}</span><br />
                              {item.nama_unit} · <span className="italic">Selesai</span>
                            </p>
                            <div className="border border-gray-400 p-2 h-16 text-[10px] overflow-auto">{item.isi_laporan}</div>
                            <p className="text-[9px] text-gray-400 mt-1">
                              📅 {formatTanggal(item.created_at)}
                            </p>
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

                          <div style={{ display: "table-cell", width: "12%" }} className="border-r-2 border-black p-3 align-top">
                            {rev && <span className={`text-[8px] font-bold px-1 py-1 border rounded text-center inline-block ${rev.cls}`}>{rev.label}</span>}
                            {item.aksi_masukan && <p className="text-[9px] text-gray-500 italic mt-1 line-clamp-2">{item.aksi_masukan}</p>}
                          </div>

                          <div style={{ display: "table-cell", width: "20%" }} className="border-r-2 border-black p-3 align-top">
                            <div className="border border-gray-300 p-2 h-16 text-[10px] overflow-auto">
                              {item.hasil_tindakan || "— (tidak ditindaklanjuti)"}
                            </div>
                            {item.tanggal_pelaksanaan && (
                              <p className="text-[9px] text-gray-400 mt-1">
                                📅 {new Date(item.tanggal_pelaksanaan).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                              </p>
                            )}
                            {item.lampiran_hasil && (
                              <button type="button" onClick={() => setSelectedImage(getImageUrl(item.lampiran_hasil))}
                                className="mt-1 flex items-center gap-1 text-[9px] text-blue-600 hover:underline">
                                🖼️ Lihat Gambar
                              </button>
                            )}
                          </div>

                          <div style={{ display: "table-cell", width: "20%" }} className="border-r-2 border-black p-3 align-top">
                            <div className="flex items-center justify-center h-full">
                              {renderKeputusanStaf(item)}
                            </div>
                          </div>

                          <div style={{ display: "table-cell", width: "8%" }} className="p-2 align-middle">
                            <div className="flex items-center justify-center">
                              <button type="button" onClick={() => handleExportPDF(item)} disabled={exportingId === item.id_boxing}
                                className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[8px] font-bold rounded">
                                {exportingId === item.id_boxing
                                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  : <><span className="text-sm leading-none">📄</span><span>PDF</span></>}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>

        {/* ── MOBILE ── */}
        <div className="lg:hidden">
          {aktif.length === 0 && selesai.length === 0 ? (
            <div className="p-8 text-center text-gray-400 italic">Belum ada laporan diproses.</div>
          ) : (
            <>
              {aktif.map(renderCard)}
              {selesai.length > 0 && (
                <>
                  <div className="bg-gray-100 px-3 py-2 text-[10px] font-bold uppercase border-t-2 border-black">Sudah selesai</div>
                  {selesai.map(renderCard)}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}