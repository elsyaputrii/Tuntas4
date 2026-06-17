"use client";
import { useState, useRef } from "react";
import { civitasApi } from "@/lib/api";

type Step = "form" | "success";

interface SubmissionFormProps {
  onGoToStatus?: (kode: string) => void;
}

export default function SubmissionForm({ onGoToStatus }: SubmissionFormProps) {
  const [step, setStep] = useState<Step>("form");
  const [status, setStatus] = useState("");
  const [jenis, setJenis] = useState("");
  const [kategori, setKategori] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [kode, setKode] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const fileRef = useRef<HTMLInputElement>(null);

  const MAX_CHARS = 10000;

  // Helper: dapatkan hari ini (jam direset ke 00:00:00 untuk perbandingan)
  const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  // Cek apakah tanggal adalah masa depan
  const isFutureDate = (year: number, month: number, day: number) => {
    const selectedDate = new Date(year, month, day);
    selectedDate.setHours(0, 0, 0, 0);
    const today = getToday();
    return selectedDate > today;
  };

  // Calendar logic
  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDay = (month: number, year: number) => new Date(year, month, 1).getDay();
  const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const dayNames = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

  function selectDate(day: number) {
    // Cegah pemilihan tanggal future
    if (isFutureDate(calYear, calMonth, day)) {
      setError("Tidak bisa memilih tanggal yang akan datang!");
      return;
    }
    
    const d = String(day).padStart(2, "0");
    const m = String(calMonth + 1).padStart(2, "0");
    setTanggal(`${d}/${m}/${calYear}`);
    setShowCalendar(false);
    setError(""); // Hapus error kalau berhasil
  }

  // Navigasi bulan dengan batasan (tidak bisa ke bulan future)
  const goPrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(y => y - 1);
    } else {
      setCalMonth(m => m - 1);
    }
  };

  const goNextMonth = () => {
    const today = getToday();
    const currentMonthStart = new Date(calYear, calMonth, 1);
    const nextMonthStart = new Date(calYear, calMonth + 1, 1);
    const nextMonthEnd = new Date(calYear, calMonth + 2, 0);
    
    // Cek apakah bulan berikutnya masih <= hari ini
    if (nextMonthStart <= today || nextMonthEnd <= today) {
      if (calMonth === 11) {
        // Cek apakah tahun depan masih <= tahun sekarang
        if (calYear + 1 <= today.getFullYear()) {
          setCalMonth(0);
          setCalYear(y => y + 1);
        }
      } else {
        setCalMonth(m => m + 1);
      }
    }
  };

  async function handleKirim() {
    setError("");
    if (!status || !jenis || !deskripsi || !tanggal) {
      setError("Semua field wajib diisi!");
      return;
    }

    // VALIDASI TANGGAL FUTURE SAAT SUBMIT (double protection)
    const [day, month, year] = tanggal.split('/').map(Number);
    if (isFutureDate(year, month - 1, day)) {
      setError("Tanggal kejadian tidak boleh lebih besar dari hari ini!");
      return;
    }

    const formData = new FormData();
    formData.append("status_pelapor", status);
    formData.append("jenis_laporan", jenis);
    formData.append("deskripsi", deskripsi);
    if (file) formData.append("lampiran", file);
    try {
      setLoading(true);
      const res = await civitasApi.kirimLaporan(formData);
      setKode(res.data.kode_laporan);
      setStep("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengirim laporan.");
    } finally {
      setLoading(false);
    }
  }

  // --- STEP 3: SUCCESS ---
  if (step === "success") {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center gap-3">
          <span className="bg-white text-blue-600 rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">3</span>
          <span className="font-semibold">BERHASIL DIKIRIM</span>
        </div>
        <div className="p-8 text-center">
          {/* Confetti dots */}
          <div className="relative inline-block mb-6">
            <div className="absolute -top-4 -left-6 text-blue-400 text-lg">•</div>
            <div className="absolute -top-2 left-4 text-green-400 text-sm">•</div>
            <div className="absolute top-0 -right-6 text-yellow-400 text-lg">•</div>
            <div className="absolute -top-4 right-2 text-red-400 text-sm">•</div>
            <div className="absolute top-6 -right-8 text-purple-400 text-base">•</div>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold text-green-600 mb-2">Laporan Berhasil Dikirim!</h2>
          <p className="text-gray-500 text-sm mb-6">Terima kasih telah membantu kami menjadi lebih baik.</p>

          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-600 mb-3">Nomor Tiket Laporan Anda</p>
            <div className="bg-green-50 border border-green-200 rounded-xl px-8 py-4 inline-block">
              <p className="text-2xl font-bold text-gray-800 tracking-widest">{kode}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 flex items-center gap-2 text-sm text-blue-700 max-w-sm mx-auto">
            <span className="text-green-500 flex-shrink-0">➕</span>
            <span>Simpan nomor tiket ini untuk memantau status laporan Anda.</span>
          </div>

          <p className="text-gray-400 text-xs mb-6">Kami akan segera menindaklanjuti laporan Anda.</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                if (onGoToStatus && kode) onGoToStatus(kode);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all"
            >
              🔍 Cek Status Laporan
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(kode);
                alert("Nomor tiket disalin ke clipboard!");
              }}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all"
            >
              📋 Salin Nomor Tiket
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setKode("");
                setStatus("");
                setJenis("");
                setKategori("");
                setDeskripsi("");
                setTanggal("");
                setFile(null);
              }}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all"
            >
              ➕ Buat Laporan Baru
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- STEP 2: FORM ---
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white px-6 py-4 flex items-center gap-3">
        <span className="bg-white text-blue-600 rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">2</span>
        <span className="font-semibold">FORM LAPORAN (ANONIM)</span>
      </div>

      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Form Laporan Ketidaksesuaian</h2>

        <div className="space-y-5">
          {/* Input Status */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="sm:w-44 text-sm font-semibold text-gray-700 flex-shrink-0">
              Input Status <span className="text-red-500">*</span>
            </label>
            <div className="flex-1 relative">
              <select
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white appearance-none focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">pilih status anda</option>
                <option value="mahasiswa">Mahasiswa</option>
                <option value="dosen">Dosen</option>
                <option value="masyarakat">Masyarakat Umum</option>
              </select>
              <span className="absolute right-3 top-3 text-gray-400 pointer-events-none">▾</span>
            </div>
          </div>

          {/* Jenis Laporan */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="sm:w-44 text-sm font-semibold text-gray-700 flex-shrink-0">
              Jenis Laporan <span className="text-red-500">*</span>
            </label>
            <div className="flex-1 relative">
              <select
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white appearance-none focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                value={jenis}
                onChange={(e) => setJenis(e.target.value)}
              >
                <option value="">pilih jenis laporan</option>
                <option value="masukan">Masukan</option>
                <option value="kritik">Kritik</option>
                <option value="pengaduan">Pengaduan</option>
              </select>
              <span className="absolute right-3 top-3 text-gray-400 pointer-events-none">▾</span>
            </div>
          </div>

          {/* Masukan/Saran */}
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="sm:w-44 text-sm font-semibold text-gray-700 flex-shrink-0 pt-2">
              Masukan/Saran <span className="text-red-500">*</span>
            </label>
            <div className="flex-1">
              <textarea
                placeholder="masukan kritik atau pengaduan terkait polibatam"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 h-32 resize-none focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                value={deskripsi}
                maxLength={MAX_CHARS}
                onChange={(e) => setDeskripsi(e.target.value)}
              />
              <p className="text-right text-xs text-gray-400">{deskripsi.length}/{MAX_CHARS}</p>
            </div>
          </div>

          {/* Tanggal Kejadian */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="sm:w-44 text-sm font-semibold text-gray-700 flex-shrink-0">
              Tanggal Kejadian <span className="text-red-500">*</span>
            </label>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="dd/mm/yyyy"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                value={tanggal}
                readOnly
                onClick={() => setShowCalendar(!showCalendar)}
              />
              <span className="absolute right-3 top-2.5 text-gray-400 cursor-pointer" onClick={() => setShowCalendar(!showCalendar)}>📅</span>

              {/* Calendar Dropdown */}
              {showCalendar && (
                <div className="absolute top-12 left-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-72">
                  {/* Nav */}
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={goPrevMonth} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600">‹</button>
                    <span className="font-semibold text-sm text-gray-700">{monthNames[calMonth]} {calYear} ▾</span>
                    <button onClick={goNextMonth} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600">›</button>
                  </div>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {dayNames.map(d => <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>)}
                  </div>
                  {/* Days */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: getFirstDay(calMonth, calYear) === 0 ? 6 : getFirstDay(calMonth, calYear) - 1 }).map((_, i) => <div key={i} />)}
                    {Array.from({ length: getDaysInMonth(calMonth, calYear) }).map((_, i) => {
                      const day = i + 1;
                      const today = getToday();
                      const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                      const selD = tanggal ? parseInt(tanggal.split('/')[0]) : null;
                      const selM = tanggal ? parseInt(tanggal.split('/')[1]) - 1 : null;
                      const selY = tanggal ? parseInt(tanggal.split('/')[2]) : null;
                      const isSelected = selD === day && selM === calMonth && selY === calYear;
                      
                      // Cek apakah tanggal ini future
                      const isFuture = isFutureDate(calYear, calMonth, day);
                      
                      return (
                        <button 
                          key={day} 
                          onClick={() => !isFuture && selectDate(day)}
                          disabled={isFuture}
                          className={`w-8 h-8 text-xs rounded-full flex items-center justify-center mx-auto transition-all
                            ${isFuture ? "bg-gray-100 text-gray-300 cursor-not-allowed" :
                              isSelected ? "bg-blue-600 text-white font-bold" : 
                              isToday ? "bg-blue-100 text-blue-700 font-semibold" : 
                              "hover:bg-gray-100 text-gray-700"
                            }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    onClick={() => {
                      const today = getToday();
                      selectDate(today.getDate());
                    }} 
                    className="w-full mt-3 text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Hari ini
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Upload Bukti */}
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="sm:w-44 text-sm font-semibold text-gray-700 flex-shrink-0 pt-2">Upload Bukti (Opsional)</label>
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-2">Upload foto, dokumen, atau screenshot sebagai bukti</p>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <div className="text-3xl mb-2">☁️</div>
                <p className="text-sm text-gray-600">{file ? file.name : "Klik atau seret file ke sini"}</p>
                <p className="text-xs text-gray-400 mt-1">Maks. 5MB (JPG, PNG, PDF)</p>
              </div>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
        </div>

        {/* Anonim notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-6 flex items-center gap-2 text-sm text-blue-700">
          <span>ℹ️</span>
          <span>Laporan Anda bersifat <strong>anonim</strong>. Data pribadi tidak perlu diisi.</span>
        </div>

        {error && <p className="text-red-500 text-sm mt-4 font-medium bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}

        {/* Submit */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleKirim}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md"
          >
            {loading ? "Mengirim..." : (<><span>🚀</span> Kirim Laporan</>)}
          </button>
        </div>
      </div>
    </div>
  );
}