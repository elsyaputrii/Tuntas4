// FILE: frontend/components/kepala-unit/ResultReportTable.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { kepalaUnitApi } from "@/lib/api";

interface LaporanHasilItem {
  id_boxing: number; id_laporan: number; kode_laporan: string;
  isi_laporan: string; penyebab: string; rencana_tindakan: string;
  status_review: string; status_boxing: string; aksi_masukan: string | null;
  id_pelaksanaan: number | null;
  hasil_tindakan: string | null; lampiran_hasil: string | null;
  tanggal_pelaksanaan: string | null;
  tanggal_laporan: string | null;
  tanggal_ditindaklanjuti: string | null;
}

export default function ResultReportTable() {
  const [laporanList, setLaporanList] = useState<LaporanHasilItem[]>([]);
  const [tanggal,     setTanggal]     = useState<Record<number, string>>({});
  const [uraian,      setUraian]      = useState<Record<number, string>>({});
  const [files,       setFiles]       = useState<Record<number, File | null>>({});
  const [submitting,  setSubmitting]  = useState<Record<number, boolean>>({});
  const [loading,     setLoading]     = useState(true);
  const [errMsg,      setErrMsg]      = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true); setErrMsg("");
    try {
      const result = await kepalaUnitApi.getLaporanHasil();
      if (result.success) {
        setLaporanList(result.data);
        const initT: Record<number, string> = {};
        const initU: Record<number, string> = {};
        result.data.forEach((item: LaporanHasilItem) => {
          initT[item.id_boxing] = item.tanggal_pelaksanaan || "";
          initU[item.id_boxing] = item.hasil_tindakan      || "";
        });
        setTanggal(initT); setUraian(initU);
      }
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (id_boxing: number) => {
    if (!tanggal[id_boxing]) { alert("Tanggal pelaksanaan harus diisi."); return; }
    const item = laporanList.find(l => l.id_boxing === id_boxing);
    if (item) {
      const tanggalInput = new Date(tanggal[id_boxing]);
      tanggalInput.setHours(0, 0, 0, 0);
      const refDate = item.tanggal_ditindaklanjuti
        ? new Date(item.tanggal_ditindaklanjuti)
        : item.tanggal_laporan
          ? new Date(item.tanggal_laporan)
          : null;
      if (refDate) {
        refDate.setHours(0, 0, 0, 0);
        if (tanggalInput < refDate) {
          alert("Tanggal pelaksanaan tidak boleh lebih awal dari tanggal Ka P4M menindaklanjuti laporan.");
          return;
        }
      }
    }
    if (!uraian[id_boxing]?.trim()) { alert("Uraian hasil harus diisi."); return; }
    if (!files[id_boxing]) { alert("Gambar bukti wajib diunggah."); return; }
    setSubmitting((prev) => ({ ...prev, [id_boxing]: true }));
    try {
      const formData = new FormData();
      formData.append("id_boxing", String(id_boxing));
      formData.append("deskripsi", uraian[id_boxing].trim());
      formData.append("tanggal",   tanggal[id_boxing]);
      if (files[id_boxing]) formData.append("lampiran", files[id_boxing] as File);
      const result = await kepalaUnitApi.submitPelaksanaan(formData);
      if (result.success) { alert("Laporan hasil berhasil disimpan!"); fetchData(); }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan. Coba lagi.");
    } finally { setSubmitting((prev) => ({ ...prev, [id_boxing]: false })); }
  };

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
    <div className="w-full border-2 border-black bg-white overflow-hidden text-sm">
      <div className="flex font-semibold uppercase bg-gray-50 border-b-2 border-black text-center">
        <div className="w-[25%] border-r-2 border-black p-3 text-[10px]">Kritik atau Pengaduan</div>
        <div className="w-[15%] border-r-2 border-black p-3 text-[10px]">Penyebab</div>
        <div className="w-[15%] border-r-2 border-black p-3 text-[10px]">Rencana</div>
        <div className="w-[10%] border-r-2 border-black p-3 text-[10px]">Status</div>
        <div className="flex-1 p-3 text-[10px]">Laporan Hasil Tindak Lanjut</div>
      </div>

      {laporanList.map((item, idx) => {
        const sudahTerkirim =
          !!item.id_pelaksanaan && item.status_boxing !== "menunggu_pelaksanaan";
        const showForm = !sudahTerkirim;
        return (
          <div key={item.id_boxing} className={`flex min-h-50 ${idx > 0 ? "border-t-2 border-black" : ""}`}>
            <div className="w-[25%] border-r-2 border-black p-4">
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded block mb-2">{item.kode_laporan}</span>
              <p className="text-[11px] text-black leading-relaxed">{item.isi_laporan}</p>
            </div>
            <div className="w-[15%] border-r-2 border-black p-4 bg-gray-50">
              <p className="text-[11px] text-gray-700">{item.penyebab}</p>
            </div>
            <div className="w-[15%] border-r-2 border-black p-4 bg-gray-50">
              <p className="text-[11px] text-gray-700">{item.rencana_tindakan}</p>
            </div>
            <div className="w-[10%] border-r-2 border-black p-4 flex items-center justify-center">
              <span className={`font-bold text-center text-[10px] ${sudahTerkirim ? "text-green-600" : "text-blue-600"}`}>
                {sudahTerkirim ? "Terkirim" : "Input hasil"}
              </span>
            </div>
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
                    <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace("/api","") || "http://localhost:5000"}/uploads/${item.lampiran_hasil}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-blue-polibatam hover:underline">🖼️ Lihat Lampiran</a>
                  )}
                  <div className="text-[10px] text-green-500 font-medium">✓ Laporan telah dikirim ke Staf P4M</div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input type="date"
                    className="w-full border border-black p-2 text-[11px] outline-none focus:border-blue-polibatam"
                    value={tanggal[item.id_boxing] || ""}
                    min={item.tanggal_ditindaklanjuti
                      ? new Date(item.tanggal_ditindaklanjuti).toISOString().split('T')[0]
                      : item.tanggal_laporan
                        ? new Date(item.tanggal_laporan).toISOString().split('T')[0]
                        : undefined}
                    onChange={(e) => setTanggal((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                  />
                  <textarea
                    className="w-full h-24 border border-black p-3 text-[11px] text-black outline-none focus:border-blue-polibatam resize-none"
                    placeholder="Tambahkan Uraian Hasil Tindak Lanjut..."
                    value={uraian[item.id_boxing] || ""}
                    onChange={(e) => setUraian((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                  />
                  <div className="flex items-center gap-2">
                    <input type="file" id={`upload-${item.id_boxing}`} className="hidden" accept="image/*,application/pdf"
                      onChange={(e) => setFiles((prev) => ({ ...prev, [item.id_boxing]: e.target.files?.[0] || null }))}
                    />
                    <label htmlFor={`upload-${item.id_boxing}`}
                      className="border border-black px-3 py-1 text-[10px] cursor-pointer hover:bg-gray-100 flex items-center gap-2">
                      🖼️ {files[item.id_boxing] ? files[item.id_boxing]!.name : "tambahkan gambar (wajib)"}
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => handleSubmit(item.id_boxing)} disabled={submitting[item.id_boxing]}
                      className="bg-blue-polibatam text-white px-6 py-1.5 rounded font-bold uppercase text-[10px] hover:bg-blue-600 shadow transition-all disabled:opacity-50">
                      {submitting[item.id_boxing] ? "Menyimpan..." : "Kirim"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}