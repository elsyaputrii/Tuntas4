// FILE: frontend/components/kepala-unit/DiscrepancyTable.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { kepalaUnitApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import RencanaPanel from "@/components/kepala-unit/RencanaPanel";
import { fmtTgl } from "@/lib/exportHelpers";
import { Image as ImageIcon, Pencil, CheckCircle2 } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

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
  menunggu_keputusan_ka: { label: "⏳ Menunggu Tinjauan Ka P4M", cls: "text-blue-500 bg-blue-50 border-blue-200" },
  ditindaklanjuti: { label: "🔄 Tindak Lanjut", cls: "text-red-500 bg-red-50 border-red-200" },
  tidak_ditindaklanjuti: { label: "✅ Sesuai", cls: "text-green-500 bg-green-50 border-green-200" },
};

export default function DiscrepancyTable() {
  const [laporanList, setLaporanList] = useState<LaporanItem[]>([]);
  const [penyebab,    setPenyebab]    = useState<Record<number, string>>({});
  const [sending,     setSending]     = useState<Record<number, boolean>>({});
  const [loading,     setLoading]     = useState(true);
  const [errMsg,      setErrMsg]      = useState("");
  const [modalSrc,    setModalSrc]    = useState<string | null>(null);
  const [confirmId,   setConfirmId]   = useState<number | null>(null);

  const [rencanaCount, setRencanaCount] = useState<Record<number, number>>({});
  const [editingMode, setEditingMode] = useState<Record<number, boolean>>({});
  const [initialPenyebab, setInitialPenyebab] = useState<Record<number, string>>({});
  const [rencanaDirty, setRencanaDirty] = useState<Record<number, boolean>>({});

  const handleCountChange = useCallback((idBoxing: number, count: number) => {
    setRencanaCount((prev) => {
      if (prev[idBoxing] === count) return prev;
      return { ...prev, [idBoxing]: count };
    });
  }, []);

  const handleRencanaChange = useCallback((idBoxing: number, changed: boolean) => {
    setRencanaDirty((prev) => ({ ...prev, [idBoxing]: changed }));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true); setErrMsg("");
    try {
      const result = await kepalaUnitApi.getLaporanMasuk();
      if (result.success) {
        const laporanBaru = (result.data as LaporanItem[]).filter(
          (item) => item.approval_staf !== "ditolak"
        );
        setLaporanList(laporanBaru);
        const initP: Record<number, string> = {};
        const initInitial: Record<number, string> = {};
        laporanBaru.forEach((item: LaporanItem) => {
          initP[item.id_boxing] = item.penyebab || "";
          initInitial[item.id_boxing] = item.penyebab || "";
        });
        setPenyebab(initP);
        setInitialPenyebab(initInitial);
        setEditingMode({});
        setRencanaDirty({});
      }
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : "Gagal memuat data laporan.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sudahDikirim = (item: LaporanItem): boolean => {
    const statusBoxing = item.status_boxing ?? "";
    if (statusBoxing === "terdistribusi" || statusBoxing === "") {
      return false;
    }
    return true;
  };

  const adaPerubahan = (id_boxing: number): boolean => {
    const current = (penyebab[id_boxing] || "").trim();
    const initial = (initialPenyebab[id_boxing] || "").trim();
    const penyebabBerubah = current !== initial;
    const rencanaBerubah = !!rencanaDirty[id_boxing];
    return penyebabBerubah || rencanaBerubah;
  };

  const handleSend = (id_boxing: number) => {
    if (!penyebab[id_boxing]?.trim()) {
      alert("Penyebab harus diisi.");
      return;
    }
    if ((rencanaCount[id_boxing] || 0) === 0) {
      alert("Minimal 1 rancangan tindak lanjut harus ditambahkan.");
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
        setEditingMode((prev) => ({ ...prev, [id_boxing]: false }));
        setRencanaDirty((prev) => ({ ...prev, [id_boxing]: false }));
        fetchData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengirim. Coba lagi.");
    } finally {
      setSending((prev) => ({ ...prev, [id_boxing]: false }));
      setConfirmId(null);
    }
  };

  const handleOpenEdit = (id_boxing: number) => {
    setEditingMode((prev) => ({ ...prev, [id_boxing]: true }));
  };

  const handleCancelEdit = (id_boxing: number) => {
    setPenyebab((prev) => ({ ...prev, [id_boxing]: initialPenyebab[id_boxing] || "" }));
    setRencanaDirty((prev) => ({ ...prev, [id_boxing]: false }));
    setEditingMode((prev) => ({ ...prev, [id_boxing]: false }));
    fetchData();
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
        message="Yakin ingin mengirim ini ke Ka P4M? Penyebab dan semua Rancangan Tindak Lanjut akan diteruskan."
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
          <div className="w-[18%] border-r-2 border-black p-3 text-[11px]">Rancangan Tindak Lanjut</div>
          <div className="flex-1 p-3 text-[11px]">Aksi</div>
        </div>

        {laporanList.map((item, idx) => {
          const ditolakStaf = item.approval_staf === "ditolak";
          const badge = !ditolakStaf && item.status_review ? statusBadge[item.status_review] : null;
          const sudahKirim = sudahDikirim(item);
          const isEditing = !!editingMode[item.id_boxing];
          const penyebabReadOnly = sudahKirim && !isEditing;
          const dirty = adaPerubahan(item.id_boxing);

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
                <p className="text-xs text-black leading-relaxed whitespace-pre-wrap break-words text-justify">{item.isi_laporan}</p>
                {item.lampiran_laporan && (
                  <button onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran_laporan}`)}
                    className="text-[10px] text-blue-500 hover:underline inline-flex items-center gap-1">
                    <ImageIcon size={12} /> Lihat Gambar
                  </button>
                )}
                {ditolakStaf && item.catatan_approval && (
                  <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-[10px] text-yellow-800 leading-relaxed text-justify whitespace-pre-wrap break-words">
                    <span className="font-semibold">Catatan Staf P4M:</span> {item.catatan_approval}
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Penyebab</p>
                    {sudahKirim && (
                      isEditing ? (
                        <button
                          type="button"
                          onClick={() => handleCancelEdit(item.id_boxing)}
                          className="border border-black text-black hover:bg-black hover:text-white px-2 py-0.5 rounded text-[10px] font-bold transition-all"
                        >
                          Batal
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item.id_boxing)}
                          className="border border-black text-black hover:bg-black hover:text-white px-2 py-0.5 rounded text-[10px] font-bold transition-all inline-flex items-center gap-1"
                        >
                          <Pencil size={10} /> Edit
                        </button>
                      )
                    )}
                  </div>
                  <AutoResizeTextarea
                    minHeight={80}
                    className={`w-full border border-black p-2 text-xs outline-none focus:border-blue-polibatam rounded leading-relaxed text-justify ${penyebabReadOnly ? "bg-gray-50 text-gray-600 cursor-not-allowed" : ""}`}
                    placeholder="Ketik penyebab di sini..."
                    value={penyebab[item.id_boxing] || ""}
                    onChange={(e) => setPenyebab((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                    disabled={penyebabReadOnly}
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rancangan Tindak Lanjut</p>
                  <RencanaPanel
                    idBoxing={item.id_boxing}
                    onCountChange={handleCountChange}
                    onChange={handleRencanaChange}
                  />
                </div>

                {/* ✅ Tombol Aksi mobile */}
                {sudahKirim && !dirty ? (
                  <div className="w-full text-blue-600 font-bold uppercase text-[11px] text-center py-2.5 inline-flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={12} /> Terkirim
                  </div>
                ) : (
                  <button
                    onClick={() => handleSend(item.id_boxing)}
                    disabled={sending[item.id_boxing]}
                    className="w-full bg-blue-polibatam text-white py-2.5 rounded font-bold uppercase text-[11px] shadow hover:bg-blue-600 transition-all disabled:opacity-50"
                  >
                    {sending[item.id_boxing] ? "Mengirim..." : "Kirim"}
                  </button>
                )}
              </div>

              {/* DESKTOP */}
              <div className="hidden sm:flex min-h-40">
                <div className="w-[26%] border-r-2 border-black p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.kode_laporan}</span>
                    <span className="text-[10px] text-gray-400 capitalize">{item.jenis_laporan}</span>
                  </div>
                  <p className="text-xs text-black leading-relaxed whitespace-pre-wrap break-words text-justify">{item.isi_laporan}</p>
                  {item.lampiran_laporan && (
                    <button onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran_laporan}`)}
                      className="mt-2 text-[10px] text-blue-500 hover:underline inline-flex items-center gap-1">
                      <ImageIcon size={12} /> Lihat Gambar
                    </button>
                  )}
                  {ditolakStaf ? (
                    <div className="mt-3 px-2 py-1 border rounded text-[10px] font-medium text-red-500 bg-red-50 border-red-200">
                      Ditolak Staf P4M — Perlu Revisi
                    </div>
                  ) : badge && (
                    <div className={`mt-3 px-2 py-1 border rounded text-[10px] font-medium ${badge.cls}`}>{badge.label}</div>
                  )}
                  {ditolakStaf && item.catatan_approval && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-[10px] text-yellow-800 leading-relaxed text-justify whitespace-pre-wrap break-words">
                      <span className="font-semibold">Catatan Staf P4M:</span> {item.catatan_approval}
                    </div>
                  )}
                </div>

                <div className="w-[12%] border-r-2 border-black p-5 flex items-start justify-center pt-6">
                  <span className="text-xs text-gray-700">{fmtTgl(item.created_at ?? null)}</span>
                </div>

                <div className="w-[12%] border-r-2 border-black p-5 flex items-start justify-center pt-6">
                  <span className="text-xs text-gray-700">{fmtTgl(item.tanggal_laporan ?? item.created_at ?? null)}</span>
                </div>

                {/* Kolom Penyebab */}
                <div className="w-[18%] border-r-2 border-black p-5 flex flex-col">
                  <AutoResizeTextarea
                    minHeight={112}
                    className={`w-full border border-black p-2.5 text-xs text-black leading-relaxed outline-none focus:border-blue-polibatam text-justify ${penyebabReadOnly ? "bg-gray-50 text-gray-600 cursor-not-allowed" : ""}`}
                    placeholder="Ketik penyebab di sini..."
                    value={penyebab[item.id_boxing] || ""}
                    onChange={(e) => setPenyebab((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                    spellCheck={false}
                    disabled={penyebabReadOnly}
                  />
                  {sudahKirim && (
                    <div className="mt-2 flex justify-end">
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => handleCancelEdit(item.id_boxing)}
                          className="border border-black text-black hover:bg-black hover:text-white px-2 py-0.5 rounded text-[10px] font-bold transition-all"
                        >
                          Batal
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item.id_boxing)}
                          className="border border-black text-black hover:bg-black hover:text-white px-2 py-0.5 rounded text-[10px] font-bold transition-all inline-flex items-center gap-1"
                        >
                          <Pencil size={10} /> Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Kolom Rancangan */}
                <div className="w-[18%] border-r-2 border-black p-3">
                  <RencanaPanel
                    idBoxing={item.id_boxing}
                    onCountChange={handleCountChange}
                    onChange={handleRencanaChange}
                  />
                </div>

                {/* Kolom Aksi */}
                <div className="flex-1 p-5 flex items-start justify-center pt-6">
                  {sudahKirim && !dirty ? (
                    <span className="text-blue-600 font-bold uppercase text-[11px] inline-flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> Terkirim
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSend(item.id_boxing)}
                      disabled={sending[item.id_boxing]}
                      className="bg-blue-polibatam text-white px-8 py-2 rounded font-bold uppercase text-[10px] shadow hover:bg-blue-600 transition-all disabled:opacity-50"
                    >
                      {sending[item.id_boxing] ? "Mengirim..." : "Kirim"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}