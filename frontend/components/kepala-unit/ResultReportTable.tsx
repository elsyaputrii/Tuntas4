// FILE: frontend/components/kepala-unit/ResultReportTable.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { kepalaUnitApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";
import { CheckCircle, Lock } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

interface LaporanHasilItem {
  id_boxing: number; 
  id_laporan: number; 
  kode_laporan: string;
  isi_laporan: string; 
  penyebab: string; 
  rencana_tindakan: string;
  status_review: string; 
  status_boxing: string; 
  aksi_masukan: string | null;
  id_pelaksanaan: number | null;
  hasil_tindakan: string | null; 
  lampiran_hasil: string | null;
  tanggal_pelaksanaan: string | null;
  tanggal_laporan: string | null;
  tanggal_ditindaklanjuti: string | null;
  created_at?: string | null;
  lampiran_laporan?: string | null;
}

export default function ResultReportTable() {
  const [laporanList, setLaporanList] = useState<LaporanHasilItem[]>([]);
  const [tanggalRencana, setTanggalRencana] = useState<Record<number, string>>({});
  const [tanggal,        setTanggal]     = useState<Record<number, string>>({});
  const [uraian,         setUraian]      = useState<Record<number, string>>({});
  const [files,          setFiles]       = useState<Record<number, File | null>>({});
  const [submitting,     setSubmitting]  = useState<Record<number, boolean>>({});
  const [loading,        setLoading]     = useState(true);
  const [errMsg,         setErrMsg]      = useState("");
  const [modalSrc,       setModalSrc]    = useState<string | null>(null);
  const [telahDitindaklanjuti, setTelahDitindaklanjuti] = useState<Record<number, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true); setErrMsg("");
    try {
      const result = await kepalaUnitApi.getLaporanHasil();
      console.log("📦 Data dari API:", result);
      if (result.success) {
        setLaporanList(result.data);
        const initT: Record<number, string> = {};
        const initU: Record<number, string> = {};
        const initR: Record<number, string> = {};
        const initDone: Record<number, boolean> = {};
        result.data.forEach((item: LaporanHasilItem) => {
          initT[item.id_boxing] = item.tanggal_pelaksanaan || "";
          initU[item.id_boxing] = item.hasil_tindakan      || "";
          initR[item.id_boxing] = "";
          initDone[item.id_boxing] = !!item.id_pelaksanaan || false;
        });
        setTanggal(initT); 
        setUraian(initU); 
        setTanggalRencana(initR);
        setTelahDitindaklanjuti(initDone);
      }
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCentang = (id_boxing: number) => {
    setTelahDitindaklanjuti(prev => ({ ...prev, [id_boxing]: true }));
  };

  const handleSubmitHasil = async (id_boxing: number) => {
    if (!tanggal[id_boxing]) { 
      alert("Tanggal pelaksanaan harus diisi."); 
      return; 
    }
    if (!uraian[id_boxing]?.trim()) { 
      alert("Uraian hasil harus diisi."); 
      return; 
    }
    if (!files[id_boxing]) { 
      alert("Gambar bukti wajib diunggah."); 
      return; 
    }

    // ✅ Validasi tanggal rencana tetap ada (tanpa tombol simpan)
    if (!tanggalRencana[id_boxing]) {
      alert("Target selesai (rencana) harus diisi sebelum kirim hasil!");
      return;
    }

    const tglRencana = new Date(tanggalRencana[id_boxing]);
    const tglPelaksanaan = new Date(tanggal[id_boxing]);
    tglRencana.setHours(0,0,0,0);
    tglPelaksanaan.setHours(0,0,0,0);
    if (tglPelaksanaan > tglRencana) {
      alert(`⚠️ Tanggal pelaksanaan (${tanggal[id_boxing]}) melewati target rencana (${tanggalRencana[id_boxing]}).`);
      return;
    }

    setSubmitting((prev) => ({ ...prev, [id_boxing]: true }));
    try {
      const formData = new FormData();
      formData.append("id_boxing", String(id_boxing));
      formData.append("deskripsi", uraian[id_boxing].trim());
      formData.append("tanggal",   tanggal[id_boxing]);
      if (files[id_boxing]) formData.append("lampiran", files[id_boxing] as File);
      const result = await kepalaUnitApi.submitPelaksanaan(formData);
      if (result.success) { 
        alert("✅ Laporan hasil berhasil disimpan!"); 
        fetchData(); 
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan. Coba lagi.");
    } finally { setSubmitting((prev) => ({ ...prev, [id_boxing]: false })); }
  };

  const today = new Date().toISOString().split('T')[0];

  if (loading) return (
    <div className="w-full border-2 border-black bg-white p-12 text-center">
      <div className="w-6 h-6 border-4 border-blue-polibatam border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-gray-400 text-xs">Memuat data laporan hasil...</p>
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
      <p className="text-gray-400 text-sm italic">
        Belum ada laporan yang ditindaklanjuti Ka P4M dan menunggu hasil dari unit Anda.
      </p>
    </div>
  );

  return (
    <>
      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)} />}

      <div className="w-full border-2 border-black bg-white overflow-hidden text-sm">
        {/* HEADER */}
        <div className="flex font-semibold uppercase bg-gray-50 border-b-2 border-black text-center">
          <div className="w-[20%] border-r-2 border-black p-3 text-[10px]">Kritik atau Pengaduan</div>
          <div className="w-[12%] border-r-2 border-black p-3 text-[10px]">Tanggal Masuk</div>
          <div className="w-[12%] border-r-2 border-black p-3 text-[10px]">Penyebab</div>
          <div className="w-[14%] border-r-2 border-black p-3 text-[10px]">Rencana</div>
          <div className="w-[10%] border-r-2 border-black p-3 text-[10px]">Status</div>
          <div className="flex-1 p-3 text-[10px]">Laporan Hasil Tindak Lanjut</div>
        </div>

        {laporanList.map((item, idx) => {
          const sudahTerkirim = !!item.id_pelaksanaan && item.status_boxing !== "menunggu_pelaksanaan";
          const showForm = !sudahTerkirim;
          const isDone = telahDitindaklanjuti[item.id_boxing] || false;
          const isDisabled = !isDone && !sudahTerkirim;
          const minDate = item.tanggal_ditindaklanjuti
            ? new Date(item.tanggal_ditindaklanjuti).toISOString().split('T')[0]
            : today;

          let statusLabel = "⏳ Sedang Proses";
          let statusColor = "text-blue-600 bg-blue-50 border-blue-200";
          if (sudahTerkirim) {
            statusLabel = "✅ Selesai";
            statusColor = "text-green-600 bg-green-50 border-green-200";
          } else if (isDone) {
            statusLabel = "🔄 Telah Ditindaklanjuti";
            statusColor = "text-green-600 bg-green-50 border-green-200";
          }

          return (
            <div key={item.id_boxing} className={`flex min-h-50 ${idx > 0 ? "border-t-2 border-black" : ""}`}>
              {/* Kolom 1: Laporan + Gambar */}
              <div className="w-[20%] border-r-2 border-black p-4">
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
              <div className="w-[12%] border-r-2 border-black p-4 flex items-center justify-center">
                <span className="text-[10px] text-gray-500">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'}
                </span>
              </div>

              {/* Kolom 3: Penyebab */}
              <div className="w-[12%] border-r-2 border-black p-4 bg-gray-50">
                <p className="text-[11px] text-gray-700">{item.penyebab || '-'}</p>
              </div>

              {/* Kolom 4: Rencana + Target (Tanggal Rencana TETAP AKTIF) */}
              <div className="w-[14%] border-r-2 border-black p-4 bg-gray-50">
                <p className="text-[11px] text-gray-700">{item.rencana_tindakan || '-'}</p>
                {showForm && (
                  <div className="mt-2">
                    <label className="text-[9px] text-gray-400 block">Target Selesai</label>
                    <input
                      type="date"
                      className="w-full border border-black p-1 text-[10px] outline-none"
                      value={tanggalRencana[item.id_boxing] || ""}
                      min={today}
                      onChange={(e) => setTanggalRencana(prev => ({ ...prev, [item.id_boxing]: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* Kolom 5: Status + Centang */}
              <div className="w-[10%] border-r-2 border-black p-4 flex flex-col items-center justify-center gap-1">
                <span className={`font-bold text-center text-[10px] px-2 py-1 border rounded ${statusColor}`}>
                  {statusLabel}
                </span>
                {!sudahTerkirim && !isDone && (
                  <button
                    onClick={() => handleCentang(item.id_boxing)}
                    className="text-green-500 hover:text-green-700 transition-colors"
                    title="Tandai pekerjaan selesai"
                  >
                    <CheckCircle size={18} />
                  </button>
                )}
                {!sudahTerkirim && isDone && (
                  <span className="text-[9px] text-green-500">✓ siap diisi</span>
                )}
              </div>

              {/* Kolom 6: Laporan Hasil Tindak Lanjut */}
              <div className="flex-1 p-5">
                {item.aksi_masukan && showForm && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 text-[11px]">
                    <span className="font-bold text-blue-800">Masukan Ka P4M:</span> {item.aksi_masukan}
                  </div>
                )}
                {sudahTerkirim ? (
                  <div className="space-y-2">
                    <div className="text-[11px] text-gray-600">
                      <span className="font-medium">Tanggal:</span>{" "}
                      {item.tanggal_pelaksanaan
                        ? new Date(item.tanggal_pelaksanaan).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
                        : "-"}
                    </div>
                    <p className="text-[11px] text-black">{item.hasil_tindakan}</p>
                    {item.lampiran_hasil && (
                      <a href={`${BASE_URL}/uploads/${item.lampiran_hasil}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-blue-polibatam hover:underline">🖼️ Lihat Lampiran</a>
                    )}
                    <div className="text-[10px] text-green-500 font-medium">✓ Laporan telah dikirim ke Staf P4M</div>
                  </div>
                ) : (
                  <div className={`space-y-3 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    {isDisabled && (
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 italic mb-2">
                        <Lock size={12} /> Klik centang di status untuk mengaktifkan form
                      </div>
                    )}
                    <input type="date"
                      className="w-full border border-black p-2 text-[11px] outline-none focus:border-blue-polibatam"
                      value={tanggal[item.id_boxing] || ""}
                      min={minDate}
                      disabled={isDisabled}
                      onChange={(e) => setTanggal((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                    />
                    <textarea
                      className="w-full h-24 border border-black p-3 text-[11px] text-black outline-none focus:border-blue-polibatam resize-none"
                      placeholder={isDisabled ? "Selesaikan pekerjaan terlebih dahulu..." : "Tambahkan Uraian Hasil Tindak Lanjut..."}
                      value={uraian[item.id_boxing] || ""}
                      disabled={isDisabled}
                      onChange={(e) => setUraian((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                    />
                    <div className="flex items-center gap-2">
                      <input type="file" id={`upload-${item.id_boxing}`} className="hidden" accept="image/*,application/pdf"
                        disabled={isDisabled}
                        onChange={(e) => setFiles((prev) => ({ ...prev, [item.id_boxing]: e.target.files?.[0] || null }))}
                      />
                      <label htmlFor={`upload-${item.id_boxing}`}
                        className={`border border-black px-3 py-1 text-[10px] cursor-pointer flex items-center gap-2 ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'hover:bg-gray-100'}`}
                      >
                        🖼️ {files[item.id_boxing] ? files[item.id_boxing]!.name : "tambahkan gambar (wajib)"}
                      </label>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleSubmitHasil(item.id_boxing)}
                        disabled={submitting[item.id_boxing] || !tanggalRencana[item.id_boxing] || isDisabled}
                        className={`bg-blue-polibatam text-white px-6 py-1.5 rounded font-bold uppercase text-[10px] shadow transition-all disabled:opacity-50 ${
                          !isDisabled && tanggalRencana[item.id_boxing] ? 'hover:bg-blue-600' : ''
                        }`}
                      >
                        {submitting[item.id_boxing] ? "Menyimpan..." : "Kirim Hasil"}
                      </button>
                    </div>
                    {!tanggalRencana[item.id_boxing] && !isDisabled && (
                      <p className="text-[9px] text-red-400">⚠️ Isi target selesai dulu sebelum kirim hasil!</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}