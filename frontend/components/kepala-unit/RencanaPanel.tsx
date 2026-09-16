// FILE: frontend/components/kepala-unit/RencanaPanel.tsx
//
// ✅ Diekstrak dari DiscrepancyTable.tsx supaya bisa dipakai bersama oleh
// tab "Ketidaksesuaian Masuk" (laporan baru) DAN tab "Keputusan Staf"
// (revisi setelah ditolak Staf P4M). Sebelumnya StafDecisionTable punya
// input "Rencana Tindak Lanjut" sendiri berupa <textarea> polos yang
// datanya TIDAK PERNAH dibaca oleh backend (submitRancangan selalu ambil
// dari tabel rencana_tindak_lanjut lewat panel ini) — itu sebabnya edit
// rencana di "Keputusan Staf" tidak pernah nyampai ke Ka P4M. Dengan
// kedua tab memakai komponen yang sama, keduanya otomatis konsisten dan
// tersambung ke backend dengan benar.
"use client";
import { useState, useEffect, useCallback } from "react";
import { kepalaUnitApi } from "@/lib/api";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";

const todayStr = () => new Date().toISOString().split("T")[0];

export interface RencanaItem {
  id: number;
  teks: string;
  tanggal: string;
}

export default function RencanaPanel({
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

  // useCallback cuma depend on idBoxing (bukan onCountChange) supaya
  // tidak re-create tiap render → tidak infinite loop.
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
              <p className="text-[10px] text-gray-800 leading-snug wrap-break-words">
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
