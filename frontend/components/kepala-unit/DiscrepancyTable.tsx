// FILE: frontend/components/kepala-unit/DiscrepancyTable.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { kepalaUnitApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import { fmtTgl } from "@/lib/exportHelpers";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";

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

interface RencanaItem {
  id: number;
  teks: string;
  tanggal: string;
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  menunggu_keputusan_ka: { label: "⏳ Menunggu Keputusan Ka P4M", cls: "text-blue-500 bg-blue-50 border-blue-200" },
};

const todayStr = () => new Date().toISOString().split("T")[0];

// ═════════════════════════════════════════════════════════════════════════════
// KOMPONEN: RencanaPanel — panel rencana inline
// ✅ FIX: onCountChange sekarang terima (idBoxing, count) supaya parent
// bisa pakai useCallback yang stabil → tidak infinite loop.
// ✅ FIX: fetchRencana cuma depend on idBoxing, useEffect langsung
// panggil fetchRencana dgn dependency [idBoxing].
// ═════════════════════════════════════════════════════════════════════════════
function RencanaPanel({
  idBoxing,
  onCountChange,
}: {
  idBoxing: number;
  onCountChange?: (idBoxing: number, count: number) => void;
}) {
  const [items, setItems]             = useState<RencanaItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [errMsg, setErrMsg]           = useState("");

  const [formMode, setFormMode]       = useState<"new" | number | null>(null);
  const [formTeks, setFormTeks]       = useState("");
  const [formTanggal, setFormTanggal] = useState("");
  const [formErr, setFormErr]         = useState("");
  const [savingForm, setSavingForm]   = useState(false);

  // ✅ FIX: useCallback cuma depend on idBoxing (bukan onCountChange)
  // supaya tidak re-create tiap render → tidak infinite loop.
  const fetchRencana = useCallback(async () => {
    setLoading(true); setErrMsg("");
    try {
      const res = await kepalaUnitApi.getRencana(idBoxing);
      if (res.success) {
        const data = res.data.map((r: { id: number; teks: string; tanggal: string }) => ({
          id: r.id,
          teks: r.teks,
          tanggal: String(r.tanggal).slice(0, 10),
        }));
        setItems(data);
        onCountChange?.(idBoxing, data.length);
      }
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Gagal memuat rencana.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idBoxing]);

  // ✅ FIX: useEffect depend on idBoxing saja
  useEffect(() => {
    fetchRencana();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idBoxing]);

  const handleOpenAdd = () => {
    setFormMode("new");
    setFormTeks("");
    setFormTanggal("");
    setFormErr("");
  };

  const handleOpenEdit = (item: RencanaItem) => {
    setFormMode(item.id);
    setFormTeks(item.teks);
    setFormTanggal(item.tanggal);
    setFormErr("");
  };

  const handleCancelForm = () => {
    setFormMode(null);
    setFormErr("");
  };

  const validateForm = (): boolean => {
    if (!formTeks.trim()) {
      setFormErr("Teks tidak boleh kosong.");
      return false;
    }
    if (!formTanggal) {
      setFormErr("Tanggal harus diisi.");
      return false;
    }
    if (formTanggal < todayStr()) {
      setFormErr("Tanggal tidak boleh lewat.");
      return false;
    }
    return true;
  };

  const handleSaveNew = async () => {
    if (!validateForm()) return;
    setSavingForm(true); setFormErr("");
    try {
      const res = await kepalaUnitApi.addRencana({
        id_boxing: idBoxing,
        teks: formTeks.trim(),
        tanggal: formTanggal,
      });
      if (res.success && res.data) {
        const newList = [
          ...items,
          { id: res.data.id, teks: formTeks.trim(), tanggal: formTanggal },
        ];
        setItems(newList);
        onCountChange?.(idBoxing, newList.length);
        setFormMode(null);
      }
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSavingForm(false);
    }
  };

  const handleSaveEdit = async () => {
    if (typeof formMode !== "number" || !validateForm()) return;
    setSavingForm(true); setFormErr("");
    try {
      await kepalaUnitApi.updateRencana(formMode, {
        teks: formTeks.trim(),
        tanggal: formTanggal,
      });
      setItems((prev) =>
        prev.map((it) =>
          it.id === formMode
            ? { ...it, teks: formTeks.trim(), tanggal: formTanggal }
            : it
        )
      );
      setFormMode(null);
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : "Gagal memperbarui.");
    } finally {
      setSavingForm(false);
    }
  };

  const handleDelete = async (item: RencanaItem) => {
    if (!confirm(`Hapus rencana "${item.teks}"?`)) return;
    try {
      await kepalaUnitApi.deleteRencana(item.id);
      const newList = items.filter((it) => it.id !== item.id);
      setItems(newList);
      onCountChange?.(idBoxing, newList.length);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  };

  return (
    <div className="space-y-2">
      {formMode === null && (
        <div className="flex justify-start">
          <button
            onClick={handleOpenAdd}
            disabled={loading}
            className="border-2 border-black bg-white hover:bg-gray-100 w-12 h-8 flex items-center justify-center rounded transition-all disabled:opacity-50"
            title="Tambah rencana"
            aria-label="Tambah rencana"
          >
            <Plus size={16} className="text-black" />
          </button>
        </div>
      )}

      {formMode !== null && (
        <div className="border border-black rounded p-2 space-y-1.5 bg-white">
          <p className="text-[9px] font-bold text-black uppercase">
            {formMode === "new" ? "Tambah Rencana" : "Edit Rencana"}
          </p>

          <textarea
            className="w-full border border-black p-1.5 text-[10px] outline-none focus:border-blue-polibatam rounded resize-none"
            rows={3}
            placeholder="tulis rencana tindak lanjut"
            value={formTeks}
            onChange={(e) => setFormTeks(e.target.value)}
            autoFocus
          />

          <input
            type="date"
            className="w-full border border-black p-1.5 text-[10px] outline-none focus:border-blue-polibatam rounded"
            value={formTanggal}
            min={todayStr()}
            onChange={(e) => setFormTanggal(e.target.value)}
          />

          {formErr && (
            <p className="text-[9px] text-red-500 bg-red-50 border border-red-200 rounded p-1.5">
              {formErr}
            </p>
          )}

          <div className="flex justify-center pt-0.5">
            <button
              onClick={formMode === "new" ? handleSaveNew : handleSaveEdit}
              disabled={savingForm}
              className="bg-blue-polibatam text-white font-bold text-[10px] px-5 py-1.5 rounded hover:bg-blue-600 transition-all disabled:opacity-50"
            >
              {savingForm ? "..." : "simpan"}
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={handleCancelForm}
              disabled={savingForm}
              className="text-[9px] text-gray-500 hover:text-black underline disabled:opacity-50"
            >
              batal
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-2">
          <div className="w-3 h-3 border-2 border-blue-polibatam border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : errMsg ? (
        <p className="text-[9px] text-red-500">{errMsg}</p>
      ) : items.length === 0 && formMode === null ? (
        <p className="text-[9px] text-gray-400 italic text-center">
          Belum ada rencana
        </p>
      ) : (
        items.map((it, idx) => {
          if (formMode === it.id) return null;

          return (
            <div
              key={it.id}
              className="border border-black rounded p-2 bg-white space-y-1"
            >
              <p className="text-[10px] font-semibold text-black">
                Rencana {idx + 1}
              </p>
              <p className="text-[10px] text-gray-800 leading-snug break-words">
                {it.teks}
              </p>
              <p className="text-[9px] text-gray-600 flex items-center gap-1">
                <Calendar size={9} />
                {it.tanggal
                  ? new Date(it.tanggal).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "(belum diisi)"}
              </p>
              <div className="flex items-center gap-1 pt-0.5">
                <button
                  onClick={() => handleOpenEdit(it)}
                  disabled={formMode !== null}
                  className="border border-black text-black hover:bg-black hover:text-white px-1.5 py-0.5 rounded flex items-center gap-0.5 text-[9px] font-medium transition-all disabled:opacity-40"
                  title="Edit"
                >
                  <Pencil size={9} /> edit
                </button>
                <button
                  onClick={() => handleDelete(it)}
                  disabled={formMode !== null}
                  className="border border-black text-black hover:bg-black hover:text-white px-1.5 py-0.5 rounded flex items-center gap-0.5 text-[9px] font-medium transition-all disabled:opacity-40"
                  title="Hapus"
                >
                  <Trash2 size={9} /> hapus
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// KOMPONEN UTAMA: DiscrepancyTable
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
        setLaporanList(result.data);
        const initP: Record<number, string> = {};
        result.data.forEach((item: LaporanItem) => {
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