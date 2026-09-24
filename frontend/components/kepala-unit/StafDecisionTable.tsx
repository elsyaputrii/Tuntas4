"use client";
import { useState, useEffect, useCallback } from "react";
import { kepalaUnitApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import RencanaPanel from "@/components/kepala-unit/RencanaPanel";
import {
  Image as ImageIcon,
  XCircle,
  StickyNote,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

interface StafDecisionItem {
  id_boxing: number;
  id_laporan: number;
  kode_laporan: string;
  isi_laporan: string;
  penyebab: string | null;
  rencana_tindakan: string | null;
  status_review: string | null;
  status_boxing: string | null;
  aksi_masukan: string | null;
  approval_staf: string | null;
  catatan_approval: string | null;
  hasil_tindakan: string | null;
  lampiran_hasil: string | null;
  tanggal_pelaksanaan: string | null;
  created_at?: string | null;
  lampiran_laporan?: string | null;
}

interface StafDecisionTableProps {
  onCountChange?: (count: number) => void;
}

export default function StafDecisionTable({ onCountChange }: StafDecisionTableProps) {
  const [data, setData] = useState<StafDecisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [modalSrc, setModalSrc] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});
  const [confirmId, setConfirmId] = useState<number | null>(null);

  // FORM REVISI RANCANGAN
  const [penyebab, setPenyebab] = useState<Record<number, string>>({});

  const [rencanaCount, setRencanaCount] = useState<Record<number, number>>({});

  const handleCountChange = useCallback((idBoxing: number, count: number) => {
    setRencanaCount((prev) => {
      if (prev[idBoxing] === count) return prev;
      return { ...prev, [idBoxing]: count };
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const result = await kepalaUnitApi.getLaporanMasuk();
      if (result.success) {
        const ditolakStaf = (result.data as StafDecisionItem[]).filter(
          (item) => item.approval_staf === "ditolak"
        );

        setData(ditolakStaf);

        // Kirim jumlah data ke parent component untuk notifikasi angka
        if (onCountChange) {
          onCountChange(ditolakStaf.length);
        }

        const initP: Record<number, string> = {};
        ditolakStaf.forEach((item: StafDecisionItem) => {
          initP[item.id_boxing] = item.penyebab || "";
        });
        setPenyebab(initP);
      } else {
        setErrMsg(result.message || "Gagal memuat data.");
      }
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isFormUnchanged = (item: StafDecisionItem) => {
    const originalPenyebab = (item.penyebab || "").trim();
    const currentPenyebab = (penyebab[item.id_boxing] || "").trim();
    const isPenyebabSame = originalPenyebab === currentPenyebab;  // Cek apakah teks penyebab masih persis sama dengan data asli
    return isPenyebabSame; // Jika belum diedit sama sekali, tombol mati
  };

  const handleSubmitRevisi = (id_boxing: number) => {
    if (!penyebab[id_boxing]?.trim()) {
      alert("Penyebab wajib diisi!");
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
    setSubmitting((prev) => ({ ...prev, [id_boxing]: true }));
    try {
      await kepalaUnitApi.submitRancangan({
        id_boxing,
        penyebab: penyebab[id_boxing].trim(),
      });
      alert("Revisi rancangan dikirim ke Ka P4M untuk keputusan!");
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengirim revisi. Coba lagi.");
    } finally {
      setSubmitting((prev) => ({ ...prev, [id_boxing]: false }));
      setConfirmId(null);
    }
  };

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

  if (loading) {
    return (
      <div className="w-full border-2 border-black bg-white p-12 text-center">
        <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs">Memuat data keputusan staf...</p>
      </div>
    );
  }

  if (errMsg) {
    return (
      <div className="w-full border-2 border-red-400 bg-red-50 p-8 text-center">
        <p className="text-red-500 text-sm">{errMsg}</p>
        <button
          onClick={fetchData}
          className="mt-3 px-4 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full border-2 border-black bg-white p-12 text-center">
        <p className="text-gray-400 text-sm italic">
          Tidak ada laporan yang ditolak Staf P4M.
        </p>
      </div>
    );
  }

  return (
    <>
      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)} />}

      <ConfirmDialog
        open={confirmId !== null}
        title="Konfirmasi Kirim Revisi"
        message="Yakin ingin mengirim revisi ini ke Ka P4M? Penyebab dan semua Rencana Tindak Lanjut akan diteruskan."
        confirmLabel="Kirim"
        cancelLabel="Batal"
        loading={confirmId !== null && !!submitting[confirmId]}
        onConfirm={handleConfirmSend}
        onCancel={() => setConfirmId(null)}
      />

      <div className="w-full border-2 border-black bg-white overflow-hidden text-sm">
        {/* HEADER */}
        <div className="hidden sm:flex font-semibold uppercase bg-gray-50 border-b-2 border-black text-center">
          <div className="w-[18%] border-r-2 border-black p-3 text-[10px]">Kritik atau Pengaduan</div>
          <div className="w-[10%] border-r-2 border-black p-3 text-[10px]">Tanggal Masuk</div>
          <div className="w-[20%] border-r-2 border-black p-3 text-[10px]">Penyebab</div>
          <div className="w-[20%] border-r-2 border-black p-3 text-[10px]">Rencana Tindak Lanjut</div>
          <div className="w-[10%] border-r-2 border-black p-3 text-[10px]">Status Staf</div>
          <div className="flex-1 p-3 text-[10px]">Revisi Rancangan (Kirim ke Ka P4M)</div>
        </div>

        {data.map((item, idx) => {
          const isUnchanged = isFormUnchanged(item);
          const isDisabled = submitting[item.id_boxing] || isUnchanged;

          return (
            <div key={item.id_boxing} className={`${idx > 0 ? "border-t-2 border-black" : ""}`}>
              {/* MOBILE */}
              <div className="sm:hidden p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {item.kode_laporan}
                  </span>
                  <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-300 px-2 py-0.5 rounded flex items-center gap-1">
                    <XCircle size={11} /> Ditolak Staf P4M
                  </span>
                </div>
                <p className="text-xs text-black leading-relaxed">{item.isi_laporan}</p>
                {item.lampiran_laporan && (
                  <button
                    onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran_laporan}`)}
                    className="text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <ImageIcon size={12} /> Lihat Gambar
                  </button>
                )}
                {item.catatan_approval && (
                  <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-[10px] text-yellow-800 flex items-start gap-1">
                    <StickyNote size={11} className="shrink-0 mt-0.5" />
                    <span><span className="font-semibold">Catatan Staf P4M:</span> {item.catatan_approval}</span>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Penyebab</p>
                  <AutoResizeTextarea
                    minHeight={80}
                    className="w-full border border-black p-2 text-xs outline-none focus:border-blue-500 rounded"
                    placeholder="Penyebab revisi..."
                    value={penyebab[item.id_boxing] || ""}
                    onChange={(e) => setPenyebab((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rencana Tindak Lanjut</p>
                  <RencanaPanel idBoxing={item.id_boxing} onCountChange={handleCountChange} />
                </div>
                <button
                  onClick={() => handleSubmitRevisi(item.id_boxing)}
                  disabled={isDisabled} // Ganti dari disabled={submitting[item.id_boxing]}
                  className="w-full bg-blue-500 text-white py-2.5 rounded font-bold uppercase text-[11px] shadow hover:bg-blue-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
                >
                  {submitting[item.id_boxing] ? "Mengirim..." : "Kirim Revisi ke Ka P4M"}
                </button>
              </div>

              {/* DESKTOP */}
              <div className="hidden sm:flex min-h-40">
                {/* Kolom 1: Laporan + Gambar */}
                <div className="w-[18%] border-r-2 border-black p-4">
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded block mb-2">
                    {item.kode_laporan}
                  </span>
                  <p className="text-[11px] text-black leading-relaxed">{item.isi_laporan}</p>
                  {item.lampiran_laporan && (
                    <button
                      onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran_laporan}`)}
                      className="mt-1 text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <ImageIcon size={12} /> Lihat Gambar
                    </button>
                  )}
                </div>

                {/* Kolom 2: Tanggal Masuk */}
                <div className="w-[10%] border-r-2 border-black p-4 flex items-center justify-center">
                  <span className="text-[10px] text-gray-500">{formatTanggal(item.created_at)}</span>
                </div>

                {/* Kolom 3: Penyebab */}
                <div className="w-[20%] border-r-2 border-black p-4">
                  <AutoResizeTextarea
                    minHeight={112}
                    className="w-full border border-black p-2.5 text-xs text-black leading-relaxed outline-none focus:border-blue-500"
                    placeholder="Penyebab revisi..."
                    value={penyebab[item.id_boxing] || ""}
                    onChange={(e) => setPenyebab((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                    spellCheck={false}
                  />
                </div>

                {/* Kolom 4: Rencana Tindak Lanjut */}
                <div className="w-[20%] border-r-2 border-black p-3">
                  <RencanaPanel idBoxing={item.id_boxing} onCountChange={handleCountChange} />
                </div>

                {/* Kolom 5: Status Staf + Catatan */}
                <div className="w-[10%] border-r-2 border-black p-4 flex flex-col items-center justify-center gap-1">
                  <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-300 px-2 py-0.5 rounded flex items-center gap-1">
                    <XCircle size={11} /> Ditolak
                  </span>
                  {item.catatan_approval && (
                    <p className="text-[9px] text-gray-500 italic text-center mt-1 max-w-full break-words flex items-start gap-1 justify-center">
                      <StickyNote size={10} className="shrink-0 mt-0.5" />
                      {item.catatan_approval}
                    </p>
                  )}
                </div>

                {/* Kolom 6: Tombol Kirim */}
                <div className="flex-1 p-5 flex flex-col justify-center items-center">
                    <button
                      onClick={() => handleSubmitRevisi(item.id_boxing)}
                      disabled={isDisabled} // 👈 Ganti dari disabled={submitting[item.id_boxing]}
                      className="bg-blue-500 text-white px-8 py-2 rounded font-bold uppercase text-[10px] hover:bg-blue-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
                    >
                      {submitting[item.id_boxing] ? "Mengirim..." : "Kirim Revisi ke Ka P4M"}
                    </button>
                    <p className="text-[8px] text-gray-400 mt-2 text-center">
                      {/* ✅ Keterangan dinamis */}
                      {isUnchanged 
                        ? "Ubah penyebab/rencana untuk mengaktifkan tombol" 
                        : "Revisi akan dikirim ke Ka P4M untuk keputusan"}
                    </p>
                  </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}