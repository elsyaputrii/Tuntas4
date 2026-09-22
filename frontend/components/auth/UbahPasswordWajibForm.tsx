// FILE: frontend/components/auth/UbahPasswordWajibForm.tsx
// Muncul begitu user (Kepala Unit / KA-P4M / Staff P4M) berhasil login
// TAPI akunnya masih ditandai wajib_ganti_password = 1 (akun baru, atau
// password-nya baru saja direset ulang oleh Staf P4M lewat Data Akun).
//
// User punya 2 pilihan:
//   1. Ganti password sekarang (isi password saat ini + password baru)
//   2. Lewati — tetap pakai password yang sudah disiapkan, langsung
//      lanjut ke dashboard.
//
// Baik ganti maupun lewati, sama-sama mematikan flag wajib_ganti_password
// di database supaya tidak muncul lagi di login berikutnya.

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { userApi } from "@/lib/api";

const REDIRECT_BY_ROLE: Record<string, string> = {
  staf_p4m: "/staff-p4m",
  ka_p4m: "/ka-p4m",
  kepala_unit: "/kepala-unit",
};

export default function UbahPasswordWajibForm() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState("");

  // ── Guard: harus sudah login, dan cuma relevan kalau memang lagi
  // wajib ganti password. Kalau tidak, langsung lempar ke dashboard
  // role-nya (atau ke /login kalau belum login sama sekali).
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(userRaw);
      if (!user.wajibGantiPassword) {
        router.replace(REDIRECT_BY_ROLE[user.role] || "/login");
        return;
      }
      setChecking(false);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  function getUser(): { role?: string; [key: string]: unknown } | null {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }

  function lanjutKeDashboard() {
    const user = getUser();
    if (user) {
      // Simpan lagi ke localStorage biar layout dashboard (yang baca
      // flag ini juga) tidak nge-loop balik ke halaman ini.
      localStorage.setItem("user", JSON.stringify({ ...user, wajibGantiPassword: false }));
    }
    const tujuan = (user && REDIRECT_BY_ROLE[user.role as string]) || "/login";
    router.push(tujuan);
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
      lanjutKeDashboard();
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
      lanjutKeDashboard();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal melewati proses ini. Coba lagi."
      );
    } finally {
      setSkipping(false);
    }
  }

  function handleLogout() {
    localStorage.clear();
    router.push("/login");
  }

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/poltek.jpg"
          alt="Polibatam Background"
          fill
          className="object-cover"
          priority
        />
      </div>
      <div className="absolute inset-0 z-0 bg-white/50" />

      <div className="relative z-10 w-full max-w-sm bg-[#7C93A7] p-8 sm:p-10 rounded-[30px] shadow-2xl mx-4">
        <div className="flex flex-col items-center">
          <div className="mb-4 w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
            <ShieldCheck size={28} className="text-white" />
          </div>

          <h2 className="text-white text-center font-bold text-xl mb-2 leading-tight">
            Ganti Password Anda
          </h2>
          <p className="text-white/70 text-center text-xs mb-6 leading-relaxed">
            Ini pertama kali Anda login, atau password Anda baru saja
            disiapkan ulang. Demi keamanan, sebaiknya ganti password sekarang
            — atau lewati untuk tetap pakai password yang sudah diberikan.
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

          <button
            onClick={handleLogout}
            className="mt-3 text-[11px] text-white/60 hover:text-white/90 hover:underline transition"
          >
            Bukan Anda? Keluar
          </button>
        </div>
      </div>
    </div>
  );
}