// FILE: frontend/components/kepala-unit/DiscrepancyTable.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { kepalaUnitApi } from "@/lib/api";

interface LaporanItem {
  id_boxing: number;
  id_laporan: number;
  kode_laporan: string;
  jenis_laporan: string;
  isi_laporan: string;
  lampiran_laporan: string | null;
  status_boxing: string;
  penyebab: string | null;
  rencana_tindakan: string | null;
  status_review: string | null;
  catatan_review: string | null;
  created_at?: string | null;
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  menunggu_review:  { label: "⏳ Menunggu Review Staf P4M", cls: "text-blue-500 bg-blue-50 border-blue-200" },
  disetujui:        { label: "✓ Disetujui",                 cls: "text-green-600 bg-green-50 border-green-200" },
  tidak_disetujui:  { label: "✗ Tidak Disetujui",           cls: "text-red-500 bg-red-50 border-red-200" },
  revisi:           { label: "⚠ Perlu Revisi",              cls: "text-yellow-600 bg-yellow-50 border-yellow-200" },
};

export default function DiscrepancyTable() {
  const [laporanList, setLaporanList] = useState<LaporanItem[]>([]);
  const [penyebab,    setPenyebab]    = useState<Record<number, string>>({});
  const [rencana,     setRencana]     = useState<Record<number, string>>({});
  const [sending,     setSending]     = useState<Record<number, boolean>>({});
  const [loading,     setLoading]     = useState(true);
  const [errMsg,      setErrMsg]      = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true); setErrMsg("");
    try {
      const result = await kepalaUnitApi.getLaporanMasuk();
      if (result.success) {
        setLaporanList(result.data);
        const initP: Record<number, string> = {};
        const initR: Record<number, string> = {};
        result.data.forEach((item: LaporanItem) => {
          initP[item.id_boxing] = item.penyebab         || "";
          initR[item.id_boxing] = item.rencana_tindakan || "";
        });
        setPenyebab(initP); setRencana(initR);
      }
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : "Gagal memuat data laporan.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSend = async (id_boxing: number) => {
    if (!penyebab[id_boxing]?.trim() || !rencana[id_boxing]?.trim()) {
      alert("Penyebab dan rencana tindak lanjut harus diisi.");
      return;
    }
    setSending((prev) => ({ ...prev, [id_boxing]: true }));
    try {
      const result = await kepalaUnitApi.submitRancangan({
        id_boxing,
        penyebab:         penyebab[id_boxing].trim(),
        rencana_tindakan: rencana[id_boxing].trim(),
      });
      if (result.success) { alert("Rancangan berhasil dikirim!"); fetchData(); }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengirim. Coba lagi.");
    } finally { setSending((prev) => ({ ...prev, [id_boxing]: false })); }
  };

  const isEditable = (status: string | null) =>
    !status || status === "revisi" || status === "tidak_disetujui";

  if (loading) return (
    <div className="w-full border-2 border-black bg-white p-12 text-center">
      <div className="w-6 h-6 border-4 border-[#5da0dd] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-gray-400 text-xs">Memuat data laporan...</p>
    </div>
  );

  if (errMsg) return (
    <div className="w-full border-2 border-red-400 bg-red-50 p-8 text-center">
      <p className="text-red-500 text-sm">{errMsg}</p>
      <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-[#5da0dd] text-white text-xs rounded">Coba Lagi</button>
    </div>
  );

  if (laporanList.length === 0) return (
    <div className="w-full border-2 border-black bg-white p-12 text-center">
      <p className="text-gray-400 text-sm italic">Belum ada laporan yang didistribusikan ke unit Anda.</p>
    </div>
  );

  return (
    <div className="w-full border-2 border-black bg-white overflow-hidden text-sm">
      {/* Header desktop */}
      <div className="hidden sm:flex font-semibold uppercase bg-gray-50 border-b-2 border-black text-center">
        <div className="w-[40%] border-r-2 border-black p-3 text-[11px]">Kritik atau Pengaduan Terkait Polibatam</div>
        <div className="w-[22%] border-r-2 border-black p-3 text-[11px]">Penyebab</div>
        <div className="w-[22%] border-r-2 border-black p-3 text-[11px]">Rencana Tindak Lanjut</div>
        <div className="flex-1 p-3 text-[11px]">Aksi</div>
      </div>

      {laporanList.map((item, idx) => {
        const editable = isEditable(item.status_review);
        const badge    = item.status_review ? statusBadge[item.status_review] : null;
        return (
          <div key={item.id_boxing} className={`${idx > 0 ? "border-t-2 border-black" : ""}`}>

            {/* Mobile card */}
            <div className="sm:hidden p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.kode_laporan}</span>
                <span className="text-[10px] text-gray-400 capitalize">{item.jenis_laporan}</span>
                {badge && (
                  <span className={`text-[9px] font-medium px-2 py-0.5 border rounded ${badge.cls}`}>{badge.label}</span>
                )}
              </div>
              <p className="text-xs text-black leading-relaxed">{item.isi_laporan}</p>
              {item.status_review === "revisi" && item.catatan_review && (
                <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-[10px] text-yellow-800">
                  <span className="font-semibold">Catatan Staf P4M:</span> {item.catatan_review}
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Penyebab</p>
                <textarea
                  className="w-full h-20 border border-black p-2 text-xs outline-none focus:border-[#5da0dd] resize-none disabled:bg-gray-50 disabled:cursor-not-allowed rounded"
                  placeholder={editable ? "Ketik penyebab di sini..." : "—"}
                  value={penyebab[item.id_boxing] || ""}
                  onChange={(e) => setPenyebab((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                  disabled={!editable}
                />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rencana Tindak Lanjut</p>
                <textarea
                  className="w-full h-20 border border-black p-2 text-xs outline-none focus:border-[#5da0dd] resize-none disabled:bg-gray-50 disabled:cursor-not-allowed rounded"
                  placeholder={editable ? "Ketik rencana di sini..." : "—"}
                  value={rencana[item.id_boxing] || ""}
                  onChange={(e) => setRencana((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                  disabled={!editable}
                />
              </div>
              <div className="flex justify-end">
                {item.status_review === "disetujui" ? (
                  <div className="text-center">
                    <span className="text-green-600 font-bold text-[11px] block">✓ DISETUJUI</span>
                    <span className="text-[10px] text-gray-400">Lihat di Tab Laporan Hasil</span>
                  </div>
                ) : item.status_review === "menunggu_review" ? (
                  <span className="text-blue-500 text-[10px]">⏳ Menunggu Review</span>
                ) : (
                  <button
                    onClick={() => handleSend(item.id_boxing)}
                    disabled={sending[item.id_boxing]}
                    className="w-full bg-[#5da0dd] text-white py-2.5 rounded font-bold uppercase text-[11px] shadow hover:bg-blue-600 transition-all disabled:opacity-50"
                  >
                    {sending[item.id_boxing] ? "Mengirim..." : "Kirimkan"}
                  </button>
                )}
              </div>
            </div>

            {/* Desktop row */}
            <div className="hidden sm:flex min-h-[160px]">
              <div className="w-[40%] border-r-2 border-black p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.kode_laporan}</span>
                  <span className="text-[10px] text-gray-400 capitalize">{item.jenis_laporan}</span>
                </div>
                <p className="text-xs text-black leading-relaxed">{item.isi_laporan}</p>
                {badge && (
                  <div className={`mt-3 px-2 py-1 border rounded text-[10px] font-medium ${badge.cls}`}>{badge.label}</div>
                )}
                {item.status_review === "revisi" && item.catatan_review && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-[10px] text-yellow-800">
                    <span className="font-semibold">Catatan Staf P4M:</span> {item.catatan_review}
                  </div>
                )}
              </div>
              <div className="w-[22%] border-r-2 border-black p-5">
                <textarea
                  className="w-full h-32 border border-black p-2 text-xs text-black outline-none focus:border-[#5da0dd] resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder={editable ? "Ketik penyebab di sini..." : "—"}
                  value={penyebab[item.id_boxing] || ""}
                  onChange={(e) => setPenyebab((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                  disabled={!editable}
                />
              </div>
              <div className="w-[22%] border-r-2 border-black p-5">
                <textarea
                  className="w-full h-32 border border-black p-2 text-xs text-black outline-none focus:border-[#5da0dd] resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder={editable ? "Ketik rencana di sini..." : "—"}
                  value={rencana[item.id_boxing] || ""}
                  onChange={(e) => setRencana((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                  disabled={!editable}
                />
              </div>
              <div className="flex-1 p-5 flex items-center justify-center">
                {item.status_review === "disetujui" ? (
                  <div className="text-center">
                    <span className="text-green-600 font-bold text-[11px] block">✓ DISETUJUI</span>
                    <span className="text-[10px] text-gray-400">Lihat di Tab Laporan Hasil</span>
                  </div>
                ) : item.status_review === "menunggu_review" ? (
                  <span className="text-blue-500 text-[10px] text-center">Menunggu<br />Review</span>
                ) : (
                  <button
                    onClick={() => handleSend(item.id_boxing)}
                    disabled={sending[item.id_boxing]}
                    className="bg-[#5da0dd] text-white px-8 py-2 rounded font-bold uppercase text-[10px] shadow hover:bg-blue-600 transition-all disabled:opacity-50"
                  >
                    {sending[item.id_boxing] ? "Mengirim..." : "Kirimkan"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}