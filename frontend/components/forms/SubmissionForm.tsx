"use client";
import { useState } from "react";
import { civitasApi } from "@/lib/api";

export default function SubmissionForm() {
  // State untuk setiap inputan form
  const [status, setStatus]       = useState("");
  const [jenis, setJenis]         = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [file, setFile]           = useState<File | null>(null);

  // State kontrol UI
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [kode, setKode]       = useState(""); // menyimpan kode laporan setelah berhasil

  // Fungsi yang dipanggil saat tombol Kirim diklik
  async function handleKirim() {
    setError("");

    // Validasi di sisi frontend sebelum kirim ke backend
    if (!status || !jenis || !deskripsi) {
      setError("Status, jenis laporan, dan isi laporan wajib diisi!");
      return;
    }

    // Pakai FormData karena ada kemungkinan upload file lampiran
    const formData = new FormData();
    formData.append("status_pelapor", status);
    formData.append("jenis_laporan", jenis);
    formData.append("deskripsi", deskripsi);
    if (file) formData.append("lampiran", file);

    try {
      setLoading(true);
      const res = await civitasApi.kirimLaporan(formData);

      // Simpan kode laporan untuk ditampilkan ke civitas
      setKode(res.data.kode_laporan);

      // Reset semua field setelah berhasil
      setStatus(""); setJenis(""); setDeskripsi(""); setFile(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengirim laporan.");
    } finally {
      setLoading(false);
    }
  }

  // Layar sukses — tampil setelah laporan berhasil dikirim
  if (kode) {
    return (
      <div className="border border-gray-400 p-6 bg-white shadow-sm transition-all animate-in fade-in duration-500">
        <div className="text-center space-y-4 py-6">
          <p className="font-bold text-green-600 text-lg">✅ Laporan Berhasil Dikirim!</p>
          <p className="text-sm text-gray-600">Simpan kode ini untuk mengecek status laporan kamu:</p>
          <div className="border-2 border-blue-400 bg-blue-50 px-10 py-4 inline-block">
            <p className="text-2xl font-bold text-blue-700 tracking-widest">{kode}</p>
          </div>
          <p className="text-xs text-gray-400 italic">
            Gunakan kode di atas pada menu &quot;Lihat Status Pengajuan&quot;
          </p>
          <button
            onClick={() => setKode("")}
            className="text-sm text-blue-600 underline mt-2"
          >
            Kirim laporan lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-400 p-6 bg-white shadow-sm transition-all animate-in fade-in duration-500">
      <div className="space-y-6">

        {/* Row 1: Status Pelapor */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="w-40 font-bold text-sm">Input Status :</label>
          <select
            className="border border-gray-300 p-2 w-full md:w-64 text-gray-500 bg-gray-50 outline-none focus:ring-1 focus:ring-blue-400"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">pilih status anda</option>
            <option value="dosen">Dosen</option>
            <option value="mahasiswa">Mahasiswa</option>
            <option value="tendik">Tenaga Kependidikan</option>
            <option value="masyarakat">Masyarakat Umum</option>
          </select>
        </div>

        {/* Row 1.5: Jenis Laporan */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="w-40 font-bold text-sm">Jenis Laporan :</label>
          <select
            className="border border-gray-300 p-2 w-full md:w-64 text-gray-500 bg-gray-50 outline-none focus:ring-1 focus:ring-blue-400"
            value={jenis}
            onChange={(e) => setJenis(e.target.value)}
          >
            <option value="">pilih jenis laporan</option>
            <option value="masukan">Masukan</option>
            <option value="kritik">Kritik</option>
            <option value="pengaduan">Pengaduan</option>
          </select>
        </div>

        {/* Row 2: Isi Laporan */}
        <div className="flex flex-col md:flex-row gap-4">
          <label className="w-40 font-bold text-sm">Masukan/Saran :</label>
          <textarea
            placeholder="masukan kritik atau pengaduan terkait polibatam"
            className="border border-gray-300 p-3 flex-1 h-32 text-sm italic outline-none focus:ring-1 focus:ring-blue-400"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
          />
        </div>

        {/* Row 3: Upload Dokumen */}
        <div className="flex flex-col md:flex-row gap-4">
          <label className="w-40 font-bold text-sm">Tambahkan Gambar :</label>
          <div className="flex-1">
            <label className="flex items-center gap-2 border border-gray-500 px-4 py-2 w-max cursor-pointer text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <span>🖼️</span>
              <span className="font-medium text-sm">
                {/* Kalau sudah pilih file, tampilkan nama filenya */}
                {file ? file.name : "Tambahkan Dokumen Pendukung"}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <p className="text-red-600 text-[10px] mt-2 italic font-bold">
              *Gambar Hanya Mendukung : PDF, PNG, JPG
            </p>
          </div>
        </div>
      </div>

      {/* Tampilkan error kalau ada */}
      {error && (
        <p className="text-red-500 text-sm mt-4 font-medium">{error}</p>
      )}

      {/* Tombol Kirim */}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleKirim}
          disabled={loading}
          className="bg-[#5da0dd] text-white px-10 py-2 rounded shadow hover:bg-blue-600 transition-all font-bold tracking-wide disabled:opacity-50"
        >
          {loading ? "Mengirim..." : "Kirim"}
        </button>
      </div>
    </div>
  );
}