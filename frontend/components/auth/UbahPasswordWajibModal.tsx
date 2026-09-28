// FILE: frontend/components/auth/UbahPasswordWajibModal.tsx
// Versi POP UP dari UbahPasswordWajibForm.
//
// Dulu: setelah login dengan akun yang wajib_ganti_password = 1, user
// dilempar (router.push) ke halaman penuh /ubah-password, baru habis itu
// masuk ke dashboard.
//
// Sekarang: user langsung masuk ke halaman dashboard role-nya seperti biasa,
// lalu modal kecil (tidak full page) ini muncul MENUMPUK di atas dashboard.
// - Kalau user ganti password → modal tertutup, tetap di dashboard.
// - Kalau user pilih "Lewati" → modal tertutup, tetap di dashboard, pakai
//   password yang sudah ada.
//
// Dipasang di dalam layout dashboard masing-masing role (kepala-unit,
// staff-p4m, ka-p4m), dikontrol lewat state `show` + `onDone`.

"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { userApi } from "@/lib/api";

interface UbahPasswordWajibModalProps {
  // Dipanggil setelah user selesai (baik ganti password maupun lewati).
  // Layout yang pasang modal ini tinggal set state show-nya jadi false di sini.
  onDone: () => void;
}

export default function UbahPasswordWajibModal({ onDone }: UbahPasswordWajibModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState("");

  function tandaiSelesai() {
    // Matikan flag di localStorage juga, biar layout tidak nyoba
    // munculkan modal ini lagi selama sesi berjalan.
    try {
      const userRaw = localStorage.getItem("user");
      if (userRaw) {
        const user = JSON.parse(userRaw);
        localStorage.setItem("user", JSON.stringify({ ...user, wajibGantiPassword: false }));
      }
    } catch {
      // abaikan, tidak fatal
    }
    onDone();
  }

  async function handleGantiPassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Semua field wajib diisi.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }
    setError("");

    try {
      setLoading(true);
      await userApi.changePassword(currentPassword, newPassword);
      tandaiSelesai();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal mengubah password. Cek password saat ini."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLewati() {
    setError("");
    try {
      setSkipping(true);
      await userApi.skipGantiPassword();
      tandaiSelesai();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal melewati proses ini. Coba lagi."
      );
    } finally {
      setSkipping(false);
    }
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
      {/* Overlay gelap transparan menutupi dashboard di belakangnya */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Kartu pop up — cukup lega, bukan modal mini */}
      <div className="relative z-10 w-full max-w-md bg-[#7C93A7] p-8 sm:p-10 rounded-[28px] shadow-2xl">
        <div className="flex flex-col items-center">
          <div className="mb-4 w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
            <ShieldCheck size={28} className="text-white" />
          </div>

          <h2 className="text-white text-center font-bold text-xl mb-2 leading-tight">
            Ganti Password Anda
          </h2>
          <p className="text-white/70 text-center text-xs mb-6 leading-relaxed">
             Akun Anda masih memakai password bawaan. Untuk menjaga keamanan
  akun, kami sarankan Anda menggantinya sekarang. Anda juga dapat
  melewati langkah ini dan tetapmenggunakan password yang sudah ada.
          </p>

          <div className="w-full space-y-3">
            {/* Password saat ini */}
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-gray-500">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password saat ini"
                className="w-full pl-11 pr-4 py-3 rounded-lg bg-[#E8F0FE] text-gray-800 placeholder-gray-400 focus:outline-none text-sm"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            {/* Password baru */}
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-gray-500">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password baru"
                className="w-full pl-11 pr-11 py-3 rounded-lg bg-[#E8F0FE] text-gray-800 placeholder-gray-400 focus:outline-none text-sm"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Konfirmasi password baru */}
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-gray-500">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Konfirmasi password baru"
                className="w-full pl-11 pr-4 py-3 rounded-lg bg-[#E8F0FE] text-gray-800 placeholder-gray-400 focus:outline-none text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGantiPassword()}
              />
            </div>

            {error && <p className="text-red-200 text-xs text-center">{error}</p>}
          </div>

          <div className="w-full flex flex-col items-center gap-2 mt-7">
            <button
              onClick={handleGantiPassword}
              disabled={loading || skipping}
              className="w-full py-2.5 bg-white text-gray-700 font-bold rounded-full hover:bg-gray-100 transition-all shadow-md text-sm disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Ubah Password"}
            </button>
            <button
              onClick={handleLewati}
              disabled={loading || skipping}
              className="w-full py-2.5 text-white/90 font-medium text-sm hover:text-white hover:underline transition disabled:opacity-50"
            >
              {skipping ? "Memproses..." : "Lewati, gunakan password yang sudah ada"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}