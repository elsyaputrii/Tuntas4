"use client";
import { useState, useEffect, useCallback } from "react";
import { kepalaUnitApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";

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

export default function StafDecisionTable() {
  const [data, setData] = useState<StafDecisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [modalSrc, setModalSrc] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});

  // ✅ FORM REVISI RANCANGAN (bukan hasil pelaksanaan)
  const [penyebab, setPenyebab] = useState<Record<number, string>>({});
  const [rencana, setRencana] = useState<Record<number, string>>({});
  const [tanggal, setTanggal] = useState<Record<number, string>>({});
  const [uraian, setUraian] = useState<Record<number, string>>({});
  const [files, setFiles] = useState<Record<number, File | null>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const result = await kepalaUnitApi.getLaporanDitolakStaf();
      if (result.success) {
        setData(result.data);
        const initP: Record<number, string> = {};
        const initR: Record<number, string> = {};
        const initT: Record<number, string> = {};
        const initU: Record<number, string> = {};
        result.data.forEach((item: StafDecisionItem) => {
          initP[item.id_boxing] = item.penyebab || "";
          initR[item.id_boxing] = item.rencana_tindakan || "";
          initT[item.id_boxing] = item.tanggal_pelaksanaan || "";
          initU[item.id_boxing] = item.hasil_tindakan || "";
        });
        setPenyebab(initP);
        setRencana(initR);
        setTanggal(initT);
        setUraian(initU);
      }
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ✅ KIRIM REVISI RANCANGAN KE KA-P4M (bukan hasil pelaksanaan)
  const handleSubmitRevisi = async (id_boxing: number) => {
    if (!penyebab[id_boxing]?.trim()) {
      alert("Penyebab wajib diisi!");
      return;
    }
    if (!rencana[id_boxing]?.trim()) {
      alert("Rencana tindak lanjut wajib diisi!");
      return;
    }

    setSubmitting((prev) => ({ ...prev, [id_boxing]: true }));
    try {
      await kepalaUnitApi.submitRevisiRancangan({
        id_boxing,
        penyebab: penyebab[id_boxing].trim(),
        rencana_tindakan: rencana[id_boxing].trim(),
      });
      alert("✅ Revisi rancangan dikirim ke Ka P4M untuk keputusan!");
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengirim revisi. Coba lagi.");
    } finally {
      setSubmitting((prev) => ({ ...prev, [id_boxing]: false }));
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
        <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-blue-500 text-white text-xs rounded">Coba Lagi</button>
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

      <div className="w-full border-2 border-black bg-white overflow-hidden text-sm">
        {/* HEADER */}
        <div className="flex font-semibold uppercase bg-gray-50 border-b-2 border-black text-center">
          <div className="w-[18%] border-r-2 border-black p-3 text-[10px]">Kritik atau Pengaduan</div>
          <div className="w-[10%] border-r-2 border-black p-3 text-[10px]">Tanggal Masuk</div>
          <div className="w-[14%] border-r-2 border-black p-3 text-[10px]">Penyebab</div>
          <div className="w-[14%] border-r-2 border-black p-3 text-[10px]">Rencana</div>
          <div className="w-[10%] border-r-2 border-black p-3 text-[10px]">Status Staf</div>
          <div className="flex-1 p-3 text-[10px]">Revisi Rancangan (Kirim ke Ka P4M)</div>
        </div>

        {data.map((item, idx) => (
          <div key={item.id_boxing} className={`flex min-h-50 ${idx > 0 ? "border-t-2 border-black" : ""}`}>
            {/* Kolom 1: Laporan + Gambar */}
            <div className="w-[18%] border-r-2 border-black p-4">
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded block mb-2">{item.kode_laporan}</span>
              <p className="text-[11px] text-black leading-relaxed">{item.isi_laporan}</p>
              {item.lampiran_laporan && (
                <button
                  onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran_laporan}`)}
                  className="mt-1 text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                >
                  🖼️ Lihat Gambar
                </button>
              )}
            </div>

            {/* Kolom 2: Tanggal Masuk */}
            <div className="w-[10%] border-r-2 border-black p-4 flex items-center justify-center">
              <span className="text-[10px] text-gray-500">{formatTanggal(item.created_at)}</span>
            </div>

            {/* Kolom 3: Penyebab (Input) */}
            <div className="w-[14%] border-r-2 border-black p-4">
              <textarea
                className="w-full h-20 border border-black p-2 text-[10px] outline-none focus:border-blue-500 resize-none"
                placeholder="Penyebab revisi..."
                value={penyebab[item.id_boxing] || ""}
                onChange={(e) => setPenyebab((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
              />
            </div>

            {/* Kolom 4: Rencana (Input) */}
            <div className="w-[14%] border-r-2 border-black p-4">
              <textarea
                className="w-full h-20 border border-black p-2 text-[10px] outline-none focus:border-blue-500 resize-none"
                placeholder="Rencana revisi..."
                value={rencana[item.id_boxing] || ""}
                onChange={(e) => setRencana((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
              />
            </div>

            {/* Kolom 5: Status Staf + Catatan */}
            <div className="w-[10%] border-r-2 border-black p-4 flex flex-col items-center justify-center gap-1">
              <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-300 px-2 py-0.5 rounded">
                ❌ Ditolak
              </span>
              {item.catatan_approval && (
                <p className="text-[9px] text-gray-500 italic text-center mt-1 max-w-full break-words">
                  📝 {item.catatan_approval}
                </p>
              )}
            </div>

            {/* Kolom 6: Tombol Kirim */}
            <div className="flex-1 p-5 flex flex-col justify-center items-center">
              <button
                onClick={() => handleSubmitRevisi(item.id_boxing)}
                disabled={submitting[item.id_boxing]}
                className="bg-blue-500 text-white px-8 py-2 rounded font-bold uppercase text-[10px] hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                {submitting[item.id_boxing] ? "Mengirim..." : "Kirim Revisi ke Ka P4M"}
              </button>
              <p className="text-[8px] text-gray-400 mt-2 text-center">
                Revisi akan dikirim ke Ka P4M untuk keputusan
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}