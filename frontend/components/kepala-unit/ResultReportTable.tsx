// FILE: frontend/components/kepala-unit/ResultReportTable.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { kepalaUnitApi } from "@/lib/api";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import {
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";

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
  approval_staf: string | null;
  catatan_approval: string | null;
}

/**
 * Struktur satu item rencana setelah di-parse.
 */
interface RencanaItem {
  nomor: string;   // "1", "2", dst
  teks: string;    // isi rencana
  tanggal: string; // "(20/09/2026)" tanpa tanda kurung: "20/09/2026"
}

function getTodayLocalDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse string rencana dari backend.
 * Format asli (dari submitRancangan):
 *   "Rencana 1: Teks rencana A (20/09/2026)\nRencana 2: Teks rencana B (25/09/2026)"
 *
 * Return: array objek { nomor, teks, tanggal }
 */
function parseRencana(rencana: string | null | undefined): RencanaItem[] {
  if (!rencana) return [];

  // Normalisasi: buang \r, ganti newline jadi pemisah seragam.
  const cleanText = rencana.replace(/\r/g, "").trim();

  // Split berdasarkan pola "Rencana N:" (case-insensitive)
  const parts = cleanText
    .split(/(?=Rencana\s*\d+\s*:)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const items: RencanaItem[] = [];

  for (const part of parts) {
    // Ambil nomor dari prefix "Rencana N:"
    const matchPrefix = /^Rencana\s*(\d+)\s*:\s*/i.exec(part);
    if (!matchPrefix) continue;

    const nomor = matchPrefix[1];
    let body = part.slice(matchPrefix[0].length).trim();

    // Ambil tanggal di akhir, format "(20/09/2026)" atau "(20-09-2026)"
    let tanggal = "";
    const matchTgl = /\(([^)]*)\)\s*$/.exec(body);
    if (matchTgl) {
      tanggal = matchTgl[1].trim();
      body = body.slice(0, matchTgl.index).trim();
    }

    items.push({ nomor, teks: body, tanggal });
  }

  return items;
}

export default function ResultReportTable() {
  const [laporanList, setLaporanList] = useState<LaporanHasilItem[]>([]);
  const [tanggal, setTanggal] = useState<Record<number, string>>({});
  const [uraian, setUraian] = useState<Record<number, string>>({});
  const [files, setFiles] = useState<Record<number, File | null>>({});
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const result = await kepalaUnitApi.getLaporanHasil();
      if (result.success) {
        setLaporanList(result.data);
        const initT: Record<number, string> = {};
        const initU: Record<number, string> = {};
        result.data.forEach((item: LaporanHasilItem) => {
          initT[item.id_boxing] =
            item.tanggal_pelaksanaan || getTodayLocalDate();
          initU[item.id_boxing] = item.hasil_tindakan || "";
        });
        setTanggal(initT);
        setUraian(initU);
      }
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (id_boxing: number) => {
    if (!tanggal[id_boxing]) {
      alert("Tanggal pelaksanaan harus diisi.");
      return;
    }
    const tanggalInput = new Date(tanggal[id_boxing]);
    tanggalInput.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (tanggalInput > today) {
      alert("Tanggal pelaksanaan tidak boleh di masa depan.");
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
    setSubmitting((prev) => ({ ...prev, [id_boxing]: true }));
    try {
      const formData = new FormData();
      formData.append("id_boxing", String(id_boxing));
      formData.append("deskripsi", uraian[id_boxing].trim());
      formData.append("tanggal", tanggal[id_boxing]);
      if (files[id_boxing]) formData.append("lampiran", files[id_boxing] as File);
      const result = await kepalaUnitApi.submitPelaksanaan(formData);
      if (result.success) {
        alert("Laporan hasil berhasil disimpan!");
        fetchData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan. Coba lagi.");
    } finally {
      setSubmitting((prev) => ({ ...prev, [id_boxing]: false }));
    }
  };

  if (loading)
    return (
      <div className="w-full border-2 border-black bg-white p-12 text-center">
        <div className="w-6 h-6 border-4 border-blue-polibatam border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs">Memuat data laporan hasil...</p>
      </div>
    );

  if (errMsg)
    return (
      <div className="w-full border-2 border-red-400 bg-red-50 p-8 text-center">
        <p className="text-red-500 text-sm">{errMsg}</p>
        <button
          onClick={fetchData}
          className="mt-3 px-4 py-1.5 bg-blue-polibatam text-white text-xs rounded"
        >
          Coba Lagi
        </button>
      </div>
    );

  if (laporanList.length === 0)
    return (
      <div className="w-full border-2 border-black bg-white p-12 text-center">
        <p className="text-gray-400 text-sm italic">
          Belum ada laporan yang ditinjau Ka P4M dan menunggu hasil dari unit Anda.
        </p>
      </div>
    );

  return (
    <div className="w-full border-2 border-black bg-white overflow-hidden text-sm">
      {/* HEADER */}
      <div className="flex font-semibold uppercase bg-gray-50 border-b-2 border-black text-center">
        <div className="w-[30%] border-r-2 border-black p-3 text-[10px]">
          Kritik atau Pengaduan
        </div>
        <div className="w-[18%] border-r-2 border-black p-3 text-[10px]">
          Penyebab
        </div>
        <div className="w-[18%] border-r-2 border-black p-3 text-[10px]">
          Rencana Tindak Lanjut
        </div>
        <div className="flex-1 p-3 text-[10px]">Laporan Hasil Tindak Lanjut</div>
      </div>

      {laporanList.map((item, idx) => {
        const sudahTerkirim =
          !!item.id_pelaksanaan &&
          item.status_boxing !== "menunggu_pelaksanaan" &&
          item.approval_staf !== "ditolak";
        const showForm = !sudahTerkirim;
        const perluRevisi = showForm && item.approval_staf === "ditolak";

        const isSesuai = item.status_review === "tidak_ditindaklanjuti";
        const isTindakLanjut = item.status_review === "ditindaklanjuti";

        const showAksiMasukan = showForm && !!item.aksi_masukan;

        const rencanaItems = parseRencana(item.rencana_tindakan);

        return (
          <div
            key={item.id_boxing}
            className={`flex min-h-50 ${idx > 0 ? "border-t-2 border-black" : ""}`}
          >
            {/* Kolom Laporan */}
            <div className="w-[30%] border-r-2 border-black p-4">
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded block mb-2">
                {item.kode_laporan}
              </span>
              <p className="text-[11px] text-black leading-relaxed text-justify whitespace-pre-wrap break-words">
                {item.isi_laporan}
              </p>
            </div>

            {/* Kolom Penyebab */}
            <div className="w-[18%] border-r-2 border-black p-4 bg-gray-50">
              <div className="text-[11px] text-gray-700 leading-relaxed text-justify whitespace-pre-wrap break-words">
                {item.penyebab || "-"}
              </div>
            </div>

            {/* Kolom Rencana — per blok "Rencana N:" */}
            <div className="w-[18%] border-r-2 border-black p-4 bg-gray-50">
              {rencanaItems.length === 0 ? (
                <span className="text-[11px] text-gray-400 italic">-</span>
              ) : (
                <div className="space-y-3">
                  {rencanaItems.map((r, i) => (
                    <div key={i} className="text-[11px] leading-relaxed">
                      <p className="font-bold text-gray-800">
                        Rencana {r.nomor}:
                      </p>
                      <p className="text-gray-700 text-justify whitespace-pre-wrap break-words">
                        {r.teks}
                      </p>
                      {r.tanggal && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {r.tanggal}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Kolom Form / Hasil */}
            <div className="flex-1 p-5">
              {/* Badge Keputusan Ka P4M */}
              {showForm && (
                <div
                  className={`mb-3 p-2 border text-[11px] inline-flex items-center gap-2 w-full ${
                    isSesuai
                      ? "bg-green-50 border-green-300 text-green-800"
                      : isTindakLanjut
                      ? "bg-red-50 border-red-300 text-red-800"
                      : "bg-gray-50 border-gray-300 text-gray-700"
                  }`}
                >
                  {isSesuai ? (
                    <>
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>
                        <span className="font-bold">Keputusan Ka P4M:</span>{" "}
                        <span className="font-semibold">Sesuai</span>
                      </span>
                    </>
                  ) : isTindakLanjut ? (
                    <>
                      <RefreshCw size={14} className="shrink-0" />
                      <span>
                        <span className="font-bold">Keputusan Ka P4M:</span>{" "}
                        <span className="font-semibold">Tindak Lanjut</span>
                      </span>
                    </>
                  ) : (
                    <span>
                      <span className="font-bold">Keputusan Ka P4M:</span>{" "}
                      {item.status_review || "-"}
                    </span>
                  )}
                </div>
              )}

              {/* Kotak "Masukan Ka P4M" */}
              {showAksiMasukan && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 text-[11px] inline-flex items-start gap-2 w-full">
                  <MessageSquare size={14} className="text-blue-800 shrink-0 mt-0.5" />
                  <span>
                    <span className="font-bold text-blue-800">
                      Masukan Ka P4M:
                    </span>{" "}
                    <span className="whitespace-pre-wrap break-words leading-relaxed text-justify">
                      {item.aksi_masukan}
                    </span>
                  </span>
                </div>
              )}

              {/* Kotak "Alasan Ditolak Staf P4M" */}
              {perluRevisi && item.catatan_approval && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 text-[11px] inline-flex items-start gap-2 w-full">
                  <AlertTriangle size={14} className="text-red-800 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-red-800">
                      Alasan Ditolak Staf P4M:
                    </span>{" "}
                    <span className="whitespace-pre-wrap break-words leading-relaxed text-justify">
                      {item.catatan_approval}
                    </span>
                    <p className="text-[10px] text-red-600 mt-1 italic leading-relaxed">
                      Penyebab &amp; Rencana Tindak Lanjut tidak perlu diisi
                      ulang — cukup perbaiki bagian Laporan Hasil di bawah ini.
                    </p>
                  </div>
                </div>
              )}

              {sudahTerkirim ? (
                <div className="space-y-2">
                  <div className="text-[11px] text-gray-600">
                    <span className="font-medium">Tanggal:</span>{" "}
                    {item.tanggal_pelaksanaan
                      ? new Date(item.tanggal_pelaksanaan).toLocaleDateString(
                          "id-ID",
                          { day: "2-digit", month: "long", year: "numeric" }
                        )
                      : "-"}
                  </div>
                  <p className="text-[11px] text-black leading-relaxed text-justify whitespace-pre-wrap break-words">
                    {item.hasil_tindakan}
                  </p>
                  {item.lampiran_hasil && (
                    <a
                      href={`${
                        process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
                        "http://localhost:5000"
                      }/uploads/${item.lampiran_hasil}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-polibatam hover:underline inline-flex items-center gap-1"
                    >
                      <ImageIcon size={12} /> Lihat Lampiran
                    </a>
                  )}
                  <div className="text-[10px] text-green-500 font-medium inline-flex items-center gap-1">
                    <CheckCircle2 size={12} /> Laporan telah dikirim ke Staf P4M
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="date"
                    className="w-full border border-black p-2 text-[11px] outline-none focus:border-blue-polibatam"
                    value={tanggal[item.id_boxing] || ""}
                    max={getTodayLocalDate()}
                    onChange={(e) =>
                      setTanggal((prev) => ({
                        ...prev,
                        [item.id_boxing]: e.target.value,
                      }))
                    }
                  />

                  <AutoResizeTextarea
                    minHeight={96}
                    className="w-full border border-black p-3 text-[11px] text-black outline-none focus:border-blue-polibatam leading-relaxed"
                    placeholder="Tambahkan Uraian Hasil Tindak Lanjut..."
                    value={uraian[item.id_boxing] || ""}
                    onChange={(e) =>
                      setUraian((prev) => ({
                        ...prev,
                        [item.id_boxing]: e.target.value,
                      }))
                    }
                  />

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id={`upload-${item.id_boxing}`}
                        className="hidden"
                        accept="image/*,application/pdf"
                        onChange={(e) =>
                          setFiles((prev) => ({
                            ...prev,
                            [item.id_boxing]: e.target.files?.[0] || null,
                          }))
                        }
                      />
                      <label
                        htmlFor={`upload-${item.id_boxing}`}
                        className="border border-black px-3 py-1 text-[10px] cursor-pointer hover:bg-gray-100 inline-flex items-center gap-2"
                      >
                        <ImageIcon size={12} />
                        {files[item.id_boxing]
                          ? files[item.id_boxing]!.name
                          : "Tambahkan Bukti Lampiran (Wajib)"}
                      </label>
                    </div>

                    <p className="text-[10px] text-gray-500">
                      * Format yang diizinkan:{" "}
                      <strong>JPG, PNG, PDF</strong> (Maksimal{" "}
                      <strong>5 MB</strong>)
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSubmit(item.id_boxing)}
                      disabled={submitting[item.id_boxing]}
                      className="bg-blue-polibatam text-white px-6 py-1.5 rounded font-bold uppercase text-[10px] hover:bg-blue-600 shadow transition-all disabled:opacity-50"
                    >
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