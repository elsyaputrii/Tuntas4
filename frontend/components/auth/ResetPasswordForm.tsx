// FILE: frontend/components/auth/ResetPasswordForm.tsx
// Menampilkan 3 state:
//   1. invalid  → token tidak ada di URL (pesan error)
//   2. form     → form isi password baru (screenshot 2)
//   3. success  → password berhasil diubah (screenshot 3)

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";

interface ResetPasswordFormProps {
  loginPath: string; // contoh: "/staff-p4m/login"
}

export default function ResetPasswordForm({ loginPath }: ResetPasswordFormProps) {
  const searchParams    = useSearchParams();
  const token           = searchParams.get("token");

  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");
  const [success, setSuccess]                 = useState(false);

  async function handleSimpan() {
    if (!newPassword || !confirmPassword) {
      setError("Semua field wajib diisi.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    setError("");

    try {
      setLoading(true);
      await authApi.resetPassword(token!, newPassword, confirmPassword);
      setSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal mengubah password. Coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        
      </div>

      <div className="relative z-10 w-full max-w-sm bg-[#7C93A7] p-10 rounded-[30px] shadow-2xl mx-4">

        {/* ── STATE 1: Token tidak ditemukan di URL ── */}
        {!token ? (
          <div className="flex flex-col items-center text-center space-y-4">
            <span className="text-4xl">⚠️</span>
            <p className="text-white font-bold text-lg">Link Tidak Valid</p>
            <p className="text-white/70 text-sm">
              Link reset password tidak valid atau sudah kadaluwarsa.
            </p>
            <Link
              href={loginPath}
              className="mt-2 px-8 py-2 bg-white text-gray-700 font-bold rounded-full hover:bg-gray-100 transition-all shadow-md text-sm"
            >
              Kembali ke Login
            </Link>
          </div>

        ) : !success ? (
          /* ── STATE 2: Form buat password baru ── */
          <div className="flex flex-col items-center">
            <h2 className="text-white text-center font-bold text-2xl mb-8 leading-tight">
              Ganti Password <br /> Baru
            </h2>

            <div className="w-full space-y-4">
              {/* Password baru */}
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-gray-500">
                  🔒
                </span>
                <input
                  type="password"
                  placeholder="Password baru"
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-[#E8F0FE] text-gray-800 placeholder-gray-400 focus:outline-none text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              {/* Konfirmasi password */}
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-gray-500">
                  🔒
                </span>
                <input
                  type="password"
                  placeholder="Konfirmasi password"
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-[#E8F0FE] text-gray-800 placeholder-gray-400 focus:outline-none text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSimpan()}
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-red-200 text-xs text-center">{error}</p>
              )}
            </div>

            <button
              onClick={handleSimpan}
              disabled={loading}
              className="mt-8 px-8 py-2 bg-white text-gray-700 font-bold rounded-full hover:bg-gray-100 transition-all shadow-md text-sm disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Password"}
            </button>
          </div>

        ) : (
          /* ── STATE 3: Sukses (screenshot 3) ── */
          <div className="flex flex-col items-center text-center space-y-6">
            <p className="text-white font-bold text-2xl leading-snug">
              password berhasil <br /> di ubah !
            </p>
            <Link
              href={loginPath}
              className="px-8 py-2 bg-white text-gray-700 font-bold rounded-full hover:bg-gray-100 transition-all shadow-md text-sm"
            >
              login sekarang
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}