// FILE: frontend/components/kepala-unit/DiscrepancyTable.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { kepalaUnitApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import { fmtTgl } from "@/lib/exportHelpers";

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
  status_review: string | null;
  created_at?: string | null;
  // ✅ tanggal_laporan = tanggal KEJADIAN yang diisi civitas akademika
  // saat lapor (fallback ke created_at kalau tanggal_kejadian kosong).
  // Ini yang seharusnya tampil di kolom "Tanggal Masuk", bukan created_at
  // mentah (yang cuma tanggal record disimpan ke DB).
  tanggal_laporan?: string | null;
}

// ✅ Vocabulary status_review SUDAH DIPERBARUI mengikuti migrate_alur_v2.sql.
// Di tab ini (Ketidaksesuaian Masuk), status_review yang mungkin muncul
// HANYA: null (belum pernah diisi) atau "menunggu_keputusan_ka" (sudah
// dikirim, menunggu keputusan Ka P4M). Begitu Ka P4M memutuskan
// "ditindaklanjuti"/"tidak_ditindaklanjuti", baris otomatis pindah ke
// tab lain (Laporan Hasil / ditangani Staf) dan tidak lagi muncul di sini.
const statusBadge: Record<string, { label: string; cls: string }> = {
  menunggu_keputusan_ka: { label: "⏳ Menunggu Keputusan Ka P4M", cls: "text-blue-500 bg-blue-50 border-blue-200" },
};

export default function DiscrepancyTable() {
  const [laporanList, setLaporanList] = useState<LaporanItem[]>([]);
  const [penyebab,    setPenyebab]    = useState<Record<number, string>>({});
  const [rencana,     setRencana]     = useState<Record<number, string>>({});
  const [sending,     setSending]     = useState<Record<number, boolean>>({});
  const [loading,     setLoading]     = useState(true);
  const [errMsg,      setErrMsg]      = useState("");
  const [modalSrc,    setModalSrc]    = useState<string | null>(null);  // ✅ UNTUK IMAGE MODAL
  // ✅ Konfirmasi sebelum kirim (poin #3): simpan id_boxing yang mau
  // dikirim di sini dulu, baru benar-benar dikirim kalau user menekan
  // tombol "Kirim" di modal konfirmasi.
  const [confirmId,   setConfirmId]   = useState<number | null>(null);

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

  // ✅ FIX (poin #3): klik "Kirim" TIDAK langsung mengirim ke server.
  // Cuma validasi isian dulu, lalu buka modal konfirmasi "Yakin ingin
  // mengirim ini?". Data baru benar-benar dikirim kalau user menekan
  // tombol "Kirim" di modal (lihat handleConfirmSend di bawah).
  const handleSend = (id_boxing: number) => {
    if (!penyebab[id_boxing]?.trim() || !rencana[id_boxing]?.trim()) {
      alert("Penyebab dan rencana tindak lanjut harus diisi.");
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
        penyebab:         penyebab[id_boxing].trim(),
        rencana_tindakan: rencana[id_boxing].trim(),
      });
      if (result.success) { alert("Laporan berhasil dikirim!"); fetchData(); }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengirim. Coba lagi.");
    } finally {
      setSending((prev) => ({ ...prev, [id_boxing]: false }));
      setConfirmId(null);
    }
  };

  // ✅ FIX (permintaan user): Penyebab & Rencana Tindak Lanjut yang sudah
  // diisi Kepala Unit TETAP bisa diedit — termasuk saat masih menunggu
  // keputusan Ka P4M (status_review = "menunggu_keputusan_ka"). Kalau
  // datanya sudah sesuai, Kepala Unit tidak wajib mengubahnya; kalau mau
  // direvisi, tinggal edit & kirim ulang (backend submitRancangan
  // mengizinkan update selama masih "menunggu_keputusan_ka"). Kolom
  // hanya benar-benar terkunci setelah Ka P4M mengambil keputusan — tapi
  // saat itu laporan sudah tidak lagi tampil di tab ini (lihat query
  // getLaporanMasuk), jadi textarea & tombol Kirim di bawah sengaja
  // tidak lagi punya kondisi "disabled"/"non-editable" apa pun.

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
      {/* ===== IMAGE MODAL ===== */}
      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)} />}

      {/* ===== KONFIRMASI KIRIM (poin #3) ===== */}
      <ConfirmDialog
        open={confirmId !== null}
        title="Konfirmasi Kirim"
        message="Yakin ingin mengirim ini? Penyebab dan Rencana Tindak Lanjut akan diteruskan ke Ka P4M. Anda tetap bisa mengedit & mengirim ulang selama Ka P4M belum mengambil keputusan."
        confirmLabel="Kirim"
        cancelLabel="Batal"
        loading={confirmId !== null && !!sending[confirmId]}
        onConfirm={handleConfirmSend}
        onCancel={() => setConfirmId(null)}
      />

      <div className="w-full border-2 border-black bg-white overflow-hidden text-sm">
        {/* ===== HEADER DESKTOP ===== */}
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
          // ✅ FIX: badge cuma dicari untuk status yang benar-benar masih
          // relevan di tab ini (lihat comment statusBadge di atas).
          const badge = !ditolakStaf && item.status_review ? statusBadge[item.status_review] : null;
          return (
            <div key={item.id_boxing} className={`${idx > 0 ? "border-t-2 border-black" : ""}`}>

              {/* ===== MOBILE CARD ===== */}
              <div className="sm:hidden p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.kode_laporan}</span>
                  <span className="text-[10px] text-gray-400 capitalize">{item.jenis_laporan}</span>
                  <span className="text-[10px] text-gray-500">
                    📥 Masuk: {fmtTgl(item.created_at ?? null)}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    📅 Kejadian: {fmtTgl(item.tanggal_laporan ?? item.created_at ?? null)}
                  </span>
                  {ditolakStaf ? (
                    <span className="text-[9px] font-medium px-2 py-0.5 border rounded text-red-500 bg-red-50 border-red-200">
                      ⚠ Ditolak Staf P4M — Perlu Revisi
                    </span>
                  ) : badge && (
                    <span className={`text-[9px] font-medium px-2 py-0.5 border rounded ${badge.cls}`}>{badge.label}</span>
                  )}
                </div>
                <p className="text-xs text-black leading-relaxed">{item.isi_laporan}</p>
                {item.lampiran_laporan && (
                  <button
                    onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran_laporan}`)}
                    className="text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                  >
                    🖼️ Lihat Gambar
                  </button>
                )}
                {/* ✅ FIX: catatan revisi sekarang dari catatan_approval (Staf
                    P4M), bukan status_review === "revisi" yang sudah tidak
                    dipakai lagi sejak migrasi alur v2. */}
                {ditolakStaf && item.catatan_approval && (
                  <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-[10px] text-yellow-800">
                    <span className="font-semibold">Catatan Staf P4M:</span> {item.catatan_approval}
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Penyebab</p>
                  <AutoResizeTextarea
                    minHeight={80}
                    className="w-full border border-black p-2 text-xs outline-none focus:border-blue-polibatam disabled:bg-gray-50 disabled:cursor-not-allowed rounded"
                    placeholder="Ketik penyebab di sini..."
                    value={penyebab[item.id_boxing] || ""}
                    onChange={(e) => setPenyebab((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rencana Tindak Lanjut</p>
                  <AutoResizeTextarea
                    minHeight={80}
                    className="w-full border border-black p-2 text-xs outline-none focus:border-blue-polibatam disabled:bg-gray-50 disabled:cursor-not-allowed rounded"
                    placeholder="Ketik rencana di sini..."
                    value={rencana[item.id_boxing] || ""}
                    onChange={(e) => setRencana((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end">
                  {/* ✅ FIX: kolom Penyebab & Rencana Tindak Lanjut sekarang
                      selalu bisa diedit, jadi tombol Kirim juga selalu
                      aktif — termasuk saat masih menunggu keputusan Ka
                      P4M, supaya Kepala Unit bisa kirim ulang revisi
                      tanpa harus menunggu ditolak dulu. */}
                  <button
                    onClick={() => handleSend(item.id_boxing)}
                    disabled={sending[item.id_boxing]}
                    className="w-full bg-blue-polibatam text-white py-2.5 rounded font-bold uppercase text-[11px] shadow hover:bg-blue-600 transition-all disabled:opacity-50"
                  >
                    {sending[item.id_boxing] ? "Mengirim..." : "Kirimkan"}
                  </button>
                </div>
              </div>

              {/* ===== DESKTOP ROW ===== */}
              <div className="hidden sm:flex min-h-40">
                {/* Kolom 1: Laporan */}
                <div className="w-[26%] border-r-2 border-black p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.kode_laporan}</span>
                    <span className="text-[10px] text-gray-400 capitalize">{item.jenis_laporan}</span>
                  </div>
                  <p className="text-xs text-black leading-relaxed">{item.isi_laporan}</p>
                  {item.lampiran_laporan && (
                    <button
                      onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran_laporan}`)}
                      className="mt-2 text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                    >
                      🖼️ Lihat Gambar
                    </button>
                  )}
                  {ditolakStaf ? (
                    <div className="mt-3 px-2 py-1 border rounded text-[10px] font-medium text-red-500 bg-red-50 border-red-200">
                      ⚠ Ditolak Staf P4M — Perlu Revisi
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

                {/* Kolom 2: Tanggal Masuk (tanggal laporan diterima/dibuat di sistem) */}
                <div className="w-[12%] border-r-2 border-black p-5 flex items-center justify-center">
                  <span className="text-xs text-gray-700">
                    {fmtTgl(item.created_at ?? null)}
                  </span>
                </div>

                {/* Kolom 3: Tanggal Kejadian (tanggal kejadian yang diisi pelapor saat lapor) */}
                <div className="w-[12%] border-r-2 border-black p-5 flex items-center justify-center">
                  <span className="text-xs text-gray-700">
                    {fmtTgl(item.tanggal_laporan ?? item.created_at ?? null)}
                  </span>
                </div>

                {/* Kolom 4: Penyebab — ✅ FIX (poin #2): dulu kotak tinggi
                    tetap (h-30) + scroll, teks panjang jadi terlihat
                    menciut/terpotong. Sekarang pakai AutoResizeTextarea
                    supaya kotaknya memanjang ke bawah mengikuti isi teks,
                    sama seperti perilaku kolom "Kritik atau Pengaduan
                    Terkait Polibatam" di sebelah kiri. */}
                <div className="w-[18%] border-r-2 border-black p-5">
                  <AutoResizeTextarea
                    minHeight={112}
                    className="w-full border border-black p-2.5 text-xs text-black leading-relaxed outline-none focus:border-blue-polibatam disabled:bg-gray-50 disabled:cursor-not-allowed"
                    placeholder="Ketik penyebab di sini..."
                    value={penyebab[item.id_boxing] || ""}
                    onChange={(e) => setPenyebab((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                    spellCheck={false}
                  />
                </div>

                {/* Kolom 5: Rencana Tindak Lanjut — sama seperti Kolom 4 */}
                <div className="w-[18%] border-r-2 border-black p-5">
                  <AutoResizeTextarea
                    minHeight={112}
                    className="w-full border border-black p-2.5 text-xs text-black leading-relaxed outline-none focus:border-blue-polibatam disabled:bg-gray-50 disabled:cursor-not-allowed"
                    placeholder="Ketik rencana di sini..."
                    value={rencana[item.id_boxing] || ""}
                    onChange={(e) => setRencana((prev) => ({ ...prev, [item.id_boxing]: e.target.value }))}
                    spellCheck={false}
                  />
                </div>

                {/* Kolom 6: Aksi */}
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