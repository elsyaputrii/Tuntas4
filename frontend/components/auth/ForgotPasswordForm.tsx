// FILE: frontend/components/auth/ForgotPasswordForm.tsx
// Tampilan form lupa password (sama desainnya untuk semua aktor)
// Menerima props: role & loginPath agar fleksibel dipakai oleh semua aktor

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { authApi } from "@/lib/api";

interface ForgotPasswordFormProps {
  role: "staf_p4m" | "ka_p4m" | "kepala_unit";
  loginPath: string; // contoh: "/staff-p4m/login"
}

export default function ForgotPasswordForm({ role, loginPath }: ForgotPasswordFormProps) {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [sent, setSent]       = useState(false);   // sudah berhasil kirim email

  async function handleKirim() {
    if (!email.trim()) {
      setError("Email wajib diisi.");
      return;
    }
    setError("");

    try {
      setLoading(true);
      await authApi.forgotPassword(email.trim(), role);
      setSent(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal mengirim email. Coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      
      <div className="relative z-10 w-full max-w-sm bg-[#7C93A7] p-10 rounded-[30px] shadow-2xl mx-4">

        {!sent ? (
          /* ── STATE: Form input email ── */
          <div className="flex flex-col items-center">
            <h2 className="text-white text-center font-bold text-2xl mb-8 leading-tight">
              Forget <br /> Password
            </h2>

            <div className="w-full space-y-3">
              {/* Input email */}
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-gray-500">
                  👤
                </span>
                <input
                  type="email"
                  placeholder="enter your gmail"
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-[#E8F0FE] text-gray-800 placeholder-gray-400 focus:outline-none text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleKirim()}
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-red-200 text-xs text-center">{error}</p>
              )}
            </div>

            {/* Tombol kirim */}
            <button
              onClick={handleKirim}
              disabled={loading}
              className="mt-6 px-8 py-2 bg-white text-gray-700 font-bold rounded-full hover:bg-gray-100 transition-all shadow-md text-sm disabled:opacity-50"
            >
              {loading ? "Mengirim..." : "Kirim Link Reset"}
            </button>

            {/* Minta ulang / resend */}
            <button
              onClick={handleKirim}
              disabled={loading}
              className="mt-4 text-xs text-blue-200 hover:underline bg-transparent border-none cursor-pointer disabled:opacity-50"
            >
              Tidak menerima gmail? minta ulang
            </button>
          </div>

        ) : (
          /* ── STATE: Email berhasil dikirim ── */
          <div className="flex flex-col items-center text-center space-y-5">
            <span className="text-5xl">📧</span>
            <p className="text-white font-bold text-lg leading-tight">
              Link reset telah dikirim!
            </p>
            <p className="text-white/70 text-sm">
              Cek inbox email <strong>{email}</strong> dan klik link reset password.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-xs text-blue-200 hover:underline"
            >
              Kirim ke email lain
            </button>
            <Link
              href={loginPath}
              className="mt-2 px-8 py-2 bg-white text-gray-700 font-bold rounded-full hover:bg-gray-100 transition-all shadow-md text-sm"
            >
              Kembali ke Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}