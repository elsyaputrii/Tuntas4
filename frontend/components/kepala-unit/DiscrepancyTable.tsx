// FILE: frontend/components/kepala-unit/DiscrepancyTable.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { kepalaUnitApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import RencanaPanel from "@/components/kepala-unit/RencanaPanel";
import { fmtTgl } from "@/lib/exportHelpers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

// ─────────────────────────────────────────────────────────────────────────────
// TIPE DATA
// ─────────────────────────────────────────────────────────────────────────────
interface LaporanItem {
  id_boxing: number;
  id_laporan: number;
  kode_laporan: string;
  jenis_laporan: string;
  isi_laporan: string;
  lampiran_laporan: string | null;
  status_boxing: string;
  approval_staf: string | null;
  catatan_approval: string | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  tanggal_rencana: string | null;
  status_review: string | null;
  created_at?: string | null;
  tanggal_laporan?: string | null;
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  menunggu_keputusan_ka: { label: "⏳ Menunggu Keputusan Ka P4M", cls: "text-blue-500 bg-blue-50 border-blue-200" },
};

// ═════════════════════════════════════════════════════════════════════════════
// KOMPONEN UTAMA: DiscrepancyTable
// (RencanaPanel sekarang di file terpisah: @/components/kepala-unit/RencanaPanel
//  supaya bisa dipakai bareng oleh StafDecisionTable.tsx / tab "Keputusan Staf")
// ═════════════════════════════════════════════════════════════════════════════
export default function DiscrepancyTable() {
  const [laporanList, setLaporanList] = useState<LaporanItem[]>([]);
  const [penyebab,    setPenyebab]    = useState<Record<number, string>>({});
  const [sending,     setSending]     = useState<Record<number, boolean>>({});
  const [loading,     setLoading]     = useState(true);
  const [errMsg,      setErrMsg]      = useState("");
  const [modalSrc,    setModalSrc]    = useState<string | null>(null);
  const [confirmId,   setConfirmId]   = useState<number | null>(null);

  const [rencanaCount, setRencanaCount] = useState<Record<number, number>>({});

  // ✅ FIX: useCallback stabil, cuma depend on setRencanaCount (yang stabil)
  // supaya RencanaPanel tidak re-render terus.
  const handleCountChange = useCallback((idBoxing: number, count: number) => {
    setRencanaCount((prev) => {
      // Cegah update kalau nilai sama (biar tidak trigger re-render)
      if (prev[idBoxing] === count) return prev;
      return { ...prev, [idBoxing]: count };
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true); setErrMsg("");
    try {
      const result = await kepalaUnitApi.getLaporanMasuk();
      if (result.success) {
        // ✅ FIX (permintaan user): laporan yang sudah ditolak Staf P4M
        // (approval_staf === "ditolak") HANYA boleh muncul di tab
        // "Keputusan Staf" (StafDecisionTable), bukan dobel di sini juga.
        // Backend getLaporanMasuk memang sengaja tetap mengikutkan baris
        // ini (supaya StafDecisionTable — yang memakai endpoint yang
        // sama — bisa menampilkannya), jadi penyaringannya dilakukan
        // di sisi tabel masing-masing.
        const laporanBaru = (result.data as LaporanItem[]).filter(
          (item) => item.approval_staf !== "ditolak"
        );
        setLaporanList(laporanBaru);
        const initP: Record<number, string> = {};
        laporanBaru.forEach((item: LaporanItem) => {
          initP[item.id_boxing] = item.penyebab || "";
        });
        setPenyebab(initP);
      }
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : "Gagal memuat data laporan.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSend = (id_boxing: number) => {
    if (!penyebab[id_boxing]?.trim()) {
      alert("Penyebab harus diisi.");
      return;
    }
    if ((rencanaCount[id_boxing] || 0) === 0) {
      alert("Minimal 1 rencana tindak lanjut harus ditambahkan.");
      return;
    }
    setConfirmId(id_boxing);
  };

  const handleConfirmSend = async () => {
    if (confirmId === null) return;
    const id_boxing = confirmId;
    setSending((prev) => ({ ...prev, [id_boxing]: true }));
    try {
      const result = await kepalaUnitApi.submitRancangan({
        id_boxing,
        penyebab: penyebab[id_boxing].trim(),
      });
      if (result.success) {
        alert("Laporan berhasil dikirim ke Ka P4M!");
        fetchData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengirim. Coba lagi.");
    } finally {
      setSending((prev) => ({ ...prev, [id_boxing]: false }));
      setConfirmId(null);
    }
  };

  if (loading) return (
    <div className="w-full border-2 border-black bg-white p-12 text-center">
      <div className="w-6 h-6 border-4 border-blue-polibatam border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-gray-400 text-xs">Memuat data laporan...</p>
    </div>
  );

  if (errMsg) return (
    <div className="w-full border-2 border-red-400 bg-red-50 p-8 text-center">
      <p className="text-red-500 text-sm">{errMsg}</p>
      <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-blue-polibatam text-white text-xs rounded">Coba Lagi</button>
    </div>
  );

  if (laporanList.length === 0) return (
    <div className="w-full border-2 border-black bg-white p-12 text-center">
      <p className="text-gray-400 text-sm italic">Belum ada laporan yang didistribusikan ke unit Anda.</p>
    </div>
  );

  return (
    <>
      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)} />}

      <ConfirmDialog
        open={confirmId !== null}
        title="Konfirmasi Kirim"
        message="Yakin ingin mengirim ini ke Ka P4M? Penyebab dan semua Rencana Tindak Lanjut akan diteruskan."
        confirmLabel="Kirim"
        cancelLabel="Batal"
        loading={confirmId !== null && !!sending[confirmId]}
        onConfirm={handleConfirmSend}
        onCancel={() => setConfirmId(null)}
      />

      <div className="w-full border-2 border-black bg-white overflow-hidden text-sm">
        <div className="hidden sm:flex font-semibold uppercase bg-gray-50 border-b-2 border-black text-center">
          <div className="w-[26%] border-r-2 border-black p-3 text-[11px]">Kritik atau Pengaduan Terkait Polibatam</div>
          <div className="w-[12%] border-r-2 border-black p-3 text-[11px]">Tanggal Masuk</div>
          <div className="w-[12%] border-r-2 border-black p-3 text-[11px]">Tanggal Kejadian</div>
          <div className="w-[18%] border-r-2 border-black p-3 text-[11px]">Penyebab</div>
          <div className="w-[18%] border-r-2 border-black p-3 text-[11px]">Rencana Tindak Lanjut</div>
          <div className="flex-1 p-3 text-[11px]">Aksi</div>
        </div>

        {laporanList.map((item, idx) => {
          const ditolakStaf = item.approval_staf === "ditolak";
          const badge = !ditolakStaf && item.status_review ? statusBadge[item.status_review] : null;

          return (
            <div key={item.id_boxing} className={`${idx > 0 ? "border-t-2 border-black" : ""}`}>
              {/* MOBILE */}
              <div className="sm:hidden p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.kode_laporan}</span>
                  <span className="text-[10px] text-gray-400 capitalize">{item.jenis_laporan}</span>
                  {ditolakStaf ? (
                    <span className="text-[9px] font-medium px-2 py-0.5 border rounded text-red-500 bg-red-50 border-red-200">
                      Ditolak Staf P4M
                    </span>
                  ) : badge && (
                    <span className={`text-[9px] font-medium px-2 py-0.5 border rounded ${badge.cls}`}>{badge.label}</span>
                  )}
                </div>
                <p className="text-xs text-black leading-relaxed">{item.isi_laporan}</p>
                {item.lampiran_laporan && (
                  <button onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran_laporan}`)}
                    className="text-[10px] text-blue-500 hover:underline">Lihat Gambar</button>
                )}
                {ditolakStaf && item.catatan_approval && (
                  <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-[10px] text-yellow-800">
                    <span className="font-semibold">Catatan Staf P4M:</span> {item.catatan_approval}
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Penyebab</p>
                  <AutoResizeTextarea
                    minHeight={80}
                    className="w-full border border-black p-2 text-xs outline-none focus:border-blue-polibatam rounded"
                    placeholder="Ketik penyebab di sini..."
                    value={penyebab[item.id_boxing] || ""}
                    onChange={(e) => setPenyebab((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rencana Tindak Lanjut</p>
                  <RencanaPanel
                    idBoxing={item.id_boxing}
                    onCountChange={handleCountChange}
                  />
                </div>
                <button
                  onClick={() => handleSend(item.id_boxing)}
                  disabled={sending[item.id_boxing]}
                  className="w-full bg-blue-polibatam text-white py-2.5 rounded font-bold uppercase text-[11px] shadow hover:bg-blue-600 transition-all disabled:opacity-50"
                >
                  {sending[item.id_boxing] ? "Mengirim..." : "Kirimkan"}
                </button>
              </div>

              {/* DESKTOP */}
              <div className="hidden sm:flex min-h-40">
                <div className="w-[26%] border-r-2 border-black p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.kode_laporan}</span>
                    <span className="text-[10px] text-gray-400 capitalize">{item.jenis_laporan}</span>
                  </div>
                  <p className="text-xs text-black leading-relaxed">{item.isi_laporan}</p>
                  {item.lampiran_laporan && (
                    <button onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran_laporan}`)}
                      className="mt-2 text-[10px] text-blue-500 hover:underline">Lihat Gambar</button>
                  )}
                  {ditolakStaf ? (
                    <div className="mt-3 px-2 py-1 border rounded text-[10px] font-medium text-red-500 bg-red-50 border-red-200">
                      Ditolak Staf P4M — Perlu Revisi
                    </div>
                  ) : badge && (
                    <div className={`mt-3 px-2 py-1 border rounded text-[10px] font-medium ${badge.cls}`}>{badge.label}</div>
                  )}
                  {ditolakStaf && item.catatan_approval && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-[10px] text-yellow-800">
                      <span className="font-semibold">Catatan Staf P4M:</span> {item.catatan_approval}
                    </div>
                  )}
                </div>

                <div className="w-[12%] border-r-2 border-black p-5 flex items-center justify-center">
                  <span className="text-xs text-gray-700">{fmtTgl(item.created_at ?? null)}</span>
                </div>

                <div className="w-[12%] border-r-2 border-black p-5 flex items-center justify-center">
                  <span className="text-xs text-gray-700">{fmtTgl(item.tanggal_laporan ?? item.created_at ?? null)}</span>
                </div>

                <div className="w-[18%] border-r-2 border-black p-5">
                  <AutoResizeTextarea
                    minHeight={112}
                    className="w-full border border-black p-2.5 text-xs text-black leading-relaxed outline-none focus:border-blue-polibatam"
                    placeholder="Ketik penyebab di sini..."
                    value={penyebab[item.id_boxing] || ""}
                    onChange={(e) => setPenyebab((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                    spellCheck={false}
                  />
                </div>

                <div className="w-[18%] border-r-2 border-black p-3">
                  <RencanaPanel
                    idBoxing={item.id_boxing}
                    onCountChange={handleCountChange}
                  />
                </div>

                <div className="flex-1 p-5 flex items-center justify-center">
                  <button
                    onClick={() => handleSend(item.id_boxing)}
                    disabled={sending[item.id_boxing]}
                    className="bg-blue-polibatam text-white px-8 py-2 rounded font-bold uppercase text-[10px] shadow hover:bg-blue-600 transition-all disabled:opacity-50"
                  >
                    {sending[item.id_boxing] ? "Mengirim..." : "Kirim"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}