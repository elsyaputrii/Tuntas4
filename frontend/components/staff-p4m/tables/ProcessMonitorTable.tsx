"use client";
// FILE: frontend/components/staff-p4m/tables/ProcessMonitorTable.tsx

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

// ✅ STATUS KEPUTUSAN KA
const reviewBadge: Record<string, { label: string; cls: string }> = {
  menunggu_keputusan_ka: { label: "⏳ Ke Ka P4M", cls: "text-blue-600 bg-blue-50" },
  ditindaklanjuti:       { label: "🔄 Perbaikan Berkelanjutan", cls: "text-red-600 bg-red-50 border-red-200" },
  tidak_ditindaklanjuti: { label: "✅ Sesuai", cls: "text-green-600 bg-green-50 border-green-200" },
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

  // ✅ STATE UNTUK MODAL KOMENTAR
  const [modalApproval, setModalApproval] = useState<{
    open: boolean;
    id_boxing: number | null;
    keputusan: "diterima" | "ditolak" | null;
    catatan: string;
  }>({
    open: false,
    id_boxing: null,
    keputusan: null,
    catatan: "",
  });

  useEffect(() => { fetchData(); }, []);

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

  // ✅ FUNGSI BUKA MODAL
  function openApprovalModal(id_boxing: number, keputusan: "diterima" | "ditolak") {
    setModalApproval({
      open: true,
      id_boxing,
      keputusan,
      catatan: "",
    });
  }

  async function handleApprovalSubmit() {
    const { id_boxing, keputusan, catatan } = modalApproval;
    if (!id_boxing || !keputusan) return;
    if (!catatan.trim()) {
      alert("Catatan / alasan wajib diisi!");
      return;
    }

    setPendingApproval(prev => ({ ...prev, [id_boxing]: keputusan }));
    setError("");
    try {
      const res = await stafApi.setApprovalBoxing(id_boxing, keputusan, catatan.trim());
      setMsg(res.message);
      setTimeout(() => setMsg(""), 4000);
      setModalApproval({ open: false, id_boxing: null, keputusan: null, catatan: "" });
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
      approval_staf: item.approval_staf,
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

  function renderKeputusanStaf(item: ProsesItem) {
    if (item.status_boxing !== "di_staff") {
      return <span className="text-[9px] text-gray-400 italic text-center">Menunggu tahap sebelumnya</span>;
    }
    if (!item.hasil_tindakan) {
      return <span className="text-[9px] text-gray-400 italic text-center">Menunggu hasil unit</span>;
    }

    const pendingAppr = pendingApproval[item.id_boxing];
    const existingAppr = item.approval_staf;
    const apprVal = pendingAppr ?? (existingAppr && existingAppr !== "menunggu" ? existingAppr : null);

    if (apprVal) {
      return (
        <span className={`text-[10px] font-bold px-2 py-1 rounded border text-center ${
          apprVal === "diterima" ? "text-green-700 bg-green-50 border-green-300" : "text-red-700 bg-red-50 border-red-300"
        }`}>
          {apprVal === "diterima" ? "✓ Disetujui — Selesai" : "✗ Ditolak — Revisi Unit"}
        </span>
      );
    }

    return (
      <div className="flex gap-3">
        <button type="button" onClick={() => openApprovalModal(item.id_boxing, "diterima")}
          title="Terima hasil — laporan otomatis Selesai"
          className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white text-xl font-bold flex items-center justify-center shadow">
          ✓
        </button>
        <button type="button" onClick={() => openApprovalModal(item.id_boxing, "ditolak")}
          title="Tolak — kembalikan ke unit untuk revisi hasil"
          className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white text-xl font-bold flex items-center justify-center shadow">
          ✗
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
      {/* ── IMAGE MODAL ── */}
      {selectedImage && <ImageModal src={selectedImage} onClose={() => setSelectedImage(null)} />}

      {/* ── MODAL KOMENTAR KEPUTUSAN STAF ── */}
      {modalApproval.open && modalApproval.id_boxing && modalApproval.keputusan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-sm uppercase border-b-2 border-black pb-2 mb-3">
              {modalApproval.keputusan === "diterima" ? "✅ Terima Hasil" : "✗ Tolak Hasil"} — Konfirmasi
            </h3>
            <p className="text-[11px] text-gray-500 mb-3">
              ID Boxing: <strong>{modalApproval.id_boxing}</strong>
            </p>
            <div className="mb-4">
              <label className="text-[11px] font-bold uppercase block mb-1">
                Catatan / Alasan <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-black p-2 text-xs h-24 outline-none resize-none"
                placeholder={modalApproval.keputusan === "diterima" 
                  ? "Tuliskan alasan menerima hasil ini..." 
                  : "Tuliskan alasan menolak hasil ini (wajib untuk revisi)..."
                }
                value={modalApproval.catatan}
                onChange={(e) => setModalApproval(prev => ({ ...prev, catatan: e.target.value }))}
              />
              <p className="text-[9px] text-gray-400 mt-1">* Wajib diisi</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setModalApproval({ open: false, id_boxing: null, keputusan: null, catatan: "" })}
                className="px-4 py-2 border border-black text-[11px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApprovalSubmit}
                className="px-6 py-2 bg-[#5da0dd] text-white text-[11px] font-bold disabled:opacity-50"
              >
                Kirim Keputusan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
        <p className="text-[10px] text-gray-500 px-3 py-2 bg-gray-50 border-b">
          Staf P4M: ✓ terima (otomatis Selesai) · ✗ tolak (revisi hasil unit). Untuk membuka laporan dari awal, gunakan tab Rekapitulasi. Klik 📄 untuk export PDF.
        </p>
        {msg   && <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b">{msg}</p>}
        {error && <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b">❌ {error}</p>}

        {/* ── DESKTOP ── */}
        <div className="hidden lg:block">
          <div className="flex min-w-275 font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[10px]">
            <div className="w-120 border-r-2 border-black p-3">Laporan</div>
            <div className="w-40 border-r-2 border-black p-3">Keputusan Ka</div>
            <div className="w-85 border-r-2 border-black p-3">Hasil Unit</div>
            <div className="w-40 border-r-2 border-black p-3">Keputusan Staf</div>
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
                    {/* Kolom Laporan + Tanggal + Gambar */}
                    <div className="w-120 border-r-2 border-black p-3">
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

                    <div className="w-40 border-r-2 border-black p-3 flex flex-col gap-1.5 justify-center items-center">
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
                    Sudah selesai — gunakan tab Rekapitulasi untuk membuka kembali
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

                        <div className="w-40 border-r-2 border-black p-3 flex items-center justify-center">
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