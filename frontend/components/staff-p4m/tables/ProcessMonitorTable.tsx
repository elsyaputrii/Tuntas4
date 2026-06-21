"use client";
// FILE: frontend/components/staff-p4m/tables/ProcessMonitorTable.tsx
//
// ── CATATAN PERBAIKAN ────────────────────────────────────────────────────
// Permintaan terbaru: kolom "Keputusan Staf" SEKARANG selalu menampilkan
// 3 tombol BERSAMAAN (✓ ✗ ↻) untuk setiap laporan yang sudah di_staff,
// independen satu sama lain — Staf P4M bebas klik kapan saja:
//
//   ✓ → terima hasil unit → backend otomatis set status_boxing='selesai'
//       (lihat fix di stafController.js setApprovalStaf)
//   ✗ → tolak hasil unit → status_boxing TETAP 'di_staff', approval_staf
//       ='ditolak' → Kepala Unit lihat ini di tab "Laporan Hasil" untuk
//       revisi HASIL PELAKSANAAN saja (rancangan tidak direset)
//   ↻ → buka ulang TOTAL dari awal ke Kepala Unit (reset rancangan_tindakan
//       ke 'menunggu_keputusan_ka', hapus pelaksanaan_tindakan lama,
//       boxing.status → 'terdistribusi') — laporan muncul lagi di tab
//       "Ketidaksesuaian Masuk" Kepala Unit, bukan "Laporan Hasil"
//
// Ketiga tombol ini SELALU ditampilkan bersamaan begitu
// status_boxing='di_staff' DAN sudah ada hasil_tindakan dari unit — tidak
// perlu menunggu approve/tolak diputuskan dulu sebelum ↻ muncul.
//
// Setelah Staf klik ✓ (otomatis selesai) atau ↻ (reset total), baris itu
// akan PINDAH KELUAR dari section "aktif" pada fetch berikutnya — karena
// status_boxing-nya berubah jadi 'selesai' (untuk ✓) atau 'terdistribusi'
// (untuk ↻, yang berarti boxing balik ke alur paling awal Kepala Unit dan
// TIDAK LAGI muncul di tab Staf P4M sampai siklusnya berputar lagi ke sini).
// Klik ✗ (tolak) TIDAK memindahkan baris ke mana pun — laporan tetap
// terlihat di section aktif dengan badge "Ditolak — Revisi Unit".

import { useState, useEffect } from "react";
import { stafApi } from "@/lib/api";
import { exportPDFProses } from "@/lib/exportPdf";

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
  created_at?: string | null;
}

const reviewBadge: Record<string, { label: string; cls: string }> = {
  menunggu_keputusan_ka: { label: "⏳ Ke Ka P4M", cls: "text-blue-600 bg-blue-50" },
  ditindaklanjuti: { label: "✓ Ditindaklanjuti", cls: "text-green-600 bg-green-50" },
  tidak_ditindaklanjuti: { label: "✗ Tidak", cls: "text-red-600 bg-red-50" },
};

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
  const [msg, setMsg] = useState("");
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<Record<number, "diterima"|"ditolak">>({});
  const [pendingReopen, setPendingReopen] = useState<Set<number>>(new Set());

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await stafApi.getProsesMonitor();
      setData(res.data);
      setPendingReopen(new Set());
    } catch {
      setError("Gagal memuat data proses.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Tombol ↻ — bisa diklik kapan saja selama status_boxing='di_staff',
  // independen dari status approval_staf. Backend menentukan aksi mana
  // ("lanjut" vs "ditindak_lanjut") berdasarkan status_review laporan ini,
  // tapi efeknya SAMA: reset total ke awal siklus Kepala Unit.
  async function bukaUlang(id_boxing: number, statusReview: string | null) {
    const aksi = statusReview === "ditindaklanjuti" ? "ditindak_lanjut" : "lanjut";
    const ok = confirm(
      "Laporan akan dibuka kembali DARI AWAL ke Kepala Unit (rancangan & hasil pelaksanaan sebelumnya akan direset, mulai dari tab Ketidaksesuaian Masuk). Lanjutkan?"
    );
    if (!ok) return;

    setPendingReopen(prev => new Set(prev).add(id_boxing));
    setError("");
    try {
      const res = await stafApi.setKeputusanBoxing(id_boxing, aksi);
      setMsg(res.message);
      setTimeout(() => setMsg(""), 4000);
      fetchData();
    } catch (err: unknown) {
      setPendingReopen(prev => { const n = new Set(prev); n.delete(id_boxing); return n; });
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
      setTimeout(() => setError(""), 4000);
    }
  }

  async function approvalStaf(id_boxing: number, approval: "diterima" | "ditolak") {
    setPendingApproval(prev => ({ ...prev, [id_boxing]: approval }));
    setError("");
    try {
      const res = await stafApi.setApprovalBoxing(id_boxing, approval);
      setMsg(res.message);
      setTimeout(() => setMsg(""), 4000);
      fetchData();
    } catch (err: unknown) {
      setPendingApproval(prev => { const n = {...prev}; delete n[id_boxing]; return n; });
      setError(err instanceof Error ? err.message : "Gagal menyimpan approval.");
      setTimeout(() => setError(""), 4000);
    }
  }

  function getImageUrl(lampiran: string | null): string {
    if (!lampiran) return "";
    if (lampiran.startsWith("http")) return lampiran;
    if (lampiran.startsWith("uploads/")) return `${BASE_URL}/${lampiran}`;
    return `${BASE_URL}/uploads/${lampiran}`;
  }

  function handleExportPDF(item: ProsesItem) {
    setExportingId(item.id_boxing);
    exportPDFProses({
      kode_laporan: item.kode_laporan,
      jenis_laporan: item.jenis_laporan,
      isi_laporan: item.isi_laporan,
      nama_unit: item.nama_unit,
      status_boxing: item.status_boxing,
      status_review: item.status_review,
      aksi_masukan: item.aksi_masukan,
      penyebab: item.penyebab,
      rencana_tindakan: item.rencana_tindakan,
      hasil_tindakan: item.hasil_tindakan,
      lampiran_hasil: item.lampiran_hasil,
      tanggal_pelaksanaan: item.tanggal_pelaksanaan,
      created_at: item.created_at,
    });
    setTimeout(() => setExportingId(null), 1200);
  }

  // ✅ FIX UTAMA: kolom "Keputusan Staf" SEKARANG selalu render 3 tombol
  // (✓ ✗ ↻) bersamaan untuk laporan status_boxing='di_staff', independen
  // dari apakah approval_staf sudah diputuskan atau belum.
  function renderKeputusanStaf(item: ProsesItem) {
    const isPendingReopen = pendingReopen.has(item.id_boxing);

    if (item.status_boxing !== "di_staff") {
      return <span className="text-[9px] text-gray-400 italic text-center">Menunggu tahap sebelumnya</span>;
    }
    if (!item.hasil_tindakan) {
      return <span className="text-[9px] text-gray-400 italic text-center">Menunggu hasil unit</span>;
    }

    const pendingAppr = pendingApproval[item.id_boxing];
    const existingAppr = item.approval_staf;
    const apprVal = pendingAppr ?? (existingAppr && existingAppr !== "menunggu" ? existingAppr : null);

    return (
      <div className="flex flex-col items-center gap-2">
        {/* Baris status approval (kalau sudah diputuskan) */}
        {apprVal && (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
            apprVal === "diterima" ? "text-green-700 bg-green-50 border-green-300" : "text-red-700 bg-red-50 border-red-300"
          }`}>
            {apprVal === "diterima" ? "✓ Disetujui — Selesai" : "✗ Ditolak — Revisi Unit"}
          </span>
        )}

        {/* ✅ 3 tombol selalu tampil bersamaan, terlepas dari apprVal */}
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => approvalStaf(item.id_boxing, "diterima")}
            disabled={!!apprVal}
            title="Terima hasil — laporan otomatis Selesai"
            className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 disabled:bg-green-200 disabled:cursor-not-allowed text-white text-base font-bold flex items-center justify-center shadow">
            ✓
          </button>
          <button type="button"
            onClick={() => approvalStaf(item.id_boxing, "ditolak")}
            disabled={!!apprVal}
            title="Tolak — kembalikan ke unit untuk revisi hasil"
            className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-red-200 disabled:cursor-not-allowed text-white text-base font-bold flex items-center justify-center shadow">
            ✗
          </button>
          <button type="button"
            onClick={() => bukaUlang(item.id_boxing, item.status_review)}
            disabled={isPendingReopen}
            title="Buka ulang dari awal ke Kepala Unit (reset rancangan & hasil pelaksanaan)"
            className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-200 disabled:cursor-not-allowed text-white text-base font-bold flex items-center justify-center shadow">
            ↻
          </button>
        </div>

        {isPendingReopen && (
          <span className="text-[9px] text-orange-600 font-bold text-center italic">
            ⏳ Sedang ditindak ulang
          </span>
        )}
      </div>
    );
  }

  const aktif = data.filter((d) => d.status_boxing !== "selesai");
  const selesai = data.filter((d) => d.status_boxing === "selesai");

  function renderCard(item: ProsesItem) {
    const rev = item.status_review ? reviewBadge[item.status_review] : null;
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

        <div className="border border-gray-300 p-2 text-xs text-gray-700 max-h-20 overflow-auto bg-gray-50">
          {item.isi_laporan}
        </div>

        {item.aksi_masukan && (
          <p className="text-[10px] text-gray-500 italic border-l-2 border-blue-300 pl-2">{item.aksi_masukan}</p>
        )}

        {item.hasil_tindakan && (
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Hasil Unit:</p>
            <div className="border border-gray-300 p-2 text-xs text-gray-700 max-h-16 overflow-auto">{item.hasil_tindakan}</div>
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

        <div className="flex flex-wrap gap-2">
          {diStaff && (
            <div className="w-full flex justify-center">
              {renderKeputusanStaf(item)}
            </div>
          )}
          {isSelesai && (
            <span className="text-[10px] text-green-600 font-bold">✓ Selesai</span>
          )}
          {!diStaff && !isSelesai && (
            <span className="text-[10px] text-gray-400 italic">Menunggu tahap sebelumnya</span>
          )}
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="w-full border-2 border-black bg-white p-10 text-center text-sm text-gray-400 italic">Memuat data…</div>
  );

  return (
    <>
      {selectedImage && <ImageModal src={selectedImage} onClose={() => setSelectedImage(null)} />}

      <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
        <p className="text-[10px] text-gray-500 px-3 py-2 bg-gray-50 border-b">
          Staf P4M: ✓ terima (otomatis Selesai) · ✗ tolak (revisi hasil unit) · ↻ buka ulang dari awal ke Kepala Unit. Klik 📄 untuk export PDF.
        </p>
        {msg   && <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b">{msg}</p>}
        {error && <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b">❌ {error}</p>}

        {/* ── DESKTOP ── */}
        <div className="hidden lg:block">
          <div className="flex min-w-275 font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[10px]">
            <div className="w-120 border-r-2 border-black p-3">Laporan</div>
            <div className="w-40 border-r-2 border-black p-3">Keputusan Ka</div>
            <div className="w-85 border-r-2 border-black p-3">Hasil Unit</div>
            <div className="w-44 border-r-2 border-black p-3">Keputusan Staf</div>
            <div style={{width:"60px",padding:"8px",textAlign:"center"}}>PDF</div>
          </div>

          {aktif.length === 0 && selesai.length === 0 ? (
            <div className="p-8 text-center text-gray-400 italic min-w-275">Belum ada laporan diproses.</div>
          ) : (
            <>
              {aktif.map((item) => {
                const rev = item.status_review ? reviewBadge[item.status_review] : null;
                return (
                  <div key={`${item.id_laporan}-${item.id_boxing}`} className="flex min-w-275 border-t-2 border-black">
                    <div className="w-120 border-r-2 border-black p-3">
                      <p className="text-[9px] text-gray-400 mb-1 leading-tight">
                        <span className="font-bold">{item.kode_laporan}</span><br />
                        {item.nama_unit} · <span className="italic">{boxingLabel[item.status_boxing ?? ""] ?? item.status_boxing}</span>
                      </p>
                      <div className="border border-gray-400 p-2 h-16 text-[10px] overflow-auto">{item.isi_laporan}</div>
                    </div>
                    <div className="w-40 border-r-2 border-black p-3 flex flex-col gap-1 justify-center">
                      {rev && <span className={`text-[8px] font-bold px-1 py-1 border rounded text-center ${rev.cls}`}>{rev.label}</span>}
                      {item.aksi_masukan && <p className="text-[9px] text-gray-500 italic mt-1 line-clamp-2">{item.aksi_masukan}</p>}
                    </div>
                    <div className="w-85 border-r-2 border-black p-3">
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
                    {/* ✅ FIX UTAMA: 3 tombol (✓ ✗ ↻) tampil bersamaan di sini */}
                    <div className="w-44 border-r-2 border-black p-3 flex flex-col gap-1.5 justify-center items-center">
                      {renderKeputusanStaf(item)}
                    </div>
                    <div style={{width:"60px",padding:"8px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <button type="button" onClick={() => handleExportPDF(item)} disabled={exportingId === item.id_boxing}
                        className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[8px] font-bold rounded">
                        {exportingId === item.id_boxing
                          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <><span className="text-sm leading-none">📄</span><span>PDF</span></>}
                      </button>
                    </div>
                  </div>
                );
              })}

              {selesai.length > 0 && (
                <>
                  <div className="bg-gray-100 px-3 py-1 text-[10px] font-bold uppercase border-t-2 border-black min-w-275">
                    Sudah selesai
                  </div>
                  {selesai.map((item) => {
                    const rev = item.status_review ? reviewBadge[item.status_review] : null;
                    return (
                      <div key={`${item.id_laporan}-${item.id_boxing}`} className="flex min-w-275 border-t-2 border-black">
                        <div className="w-120 border-r-2 border-black p-3">
                          <p className="text-[9px] text-gray-400 mb-1 leading-tight">
                            <span className="font-bold">{item.kode_laporan}</span><br />
                            {item.nama_unit} · <span className="italic">Selesai</span>
                          </p>
                          <div className="border border-gray-400 p-2 h-16 text-[10px] overflow-auto">{item.isi_laporan}</div>
                        </div>
                        <div className="w-40 border-r-2 border-black p-3 flex flex-col gap-1 justify-center">
                          {rev && <span className={`text-[8px] font-bold px-1 py-1 border rounded text-center ${rev.cls}`}>{rev.label}</span>}
                          {item.aksi_masukan && <p className="text-[9px] text-gray-500 italic mt-1 line-clamp-2">{item.aksi_masukan}</p>}
                        </div>
                        <div className="w-85 border-r-2 border-black p-3">
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
                        <div className="w-44 border-r-2 border-black p-3 flex items-center justify-center">
                          <span className="text-[10px] text-green-600 font-bold">✓ Selesai</span>
                        </div>
                        <div style={{width:"60px",padding:"8px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <button type="button" onClick={() => handleExportPDF(item)} disabled={exportingId === item.id_boxing}
                            className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[8px] font-bold rounded">
                            {exportingId === item.id_boxing
                              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              : <><span className="text-sm leading-none">📄</span><span>PDF</span></>}
                          </button>
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