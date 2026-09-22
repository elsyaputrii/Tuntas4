"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { Eye, EyeOff, User, Lock, X, ArrowLeft } from "lucide-react";

// Ke mana user diarahkan setelah login, berdasarkan role yang
// dikembalikan backend — bukan dari path yang diakses.
const REDIRECT_BY_ROLE: Record<string, string> = {
  staf_p4m: "/staff-p4m",
  ka_p4m: "/ka-p4m",
  kepala_unit: "/kepala-unit",
};

interface LoginFormProps {
  forgotPasswordPath?: string;
  onClose?: () => void;
}

export default function LoginForm({
  forgotPasswordPath = "/forgot-password",
  onClose,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // ✅ FIX: render lewat portal ke document.body supaya modal ini SELALU
  // ada di lapisan paling atas DOM, gak peduli komponen lain di halaman
  // (mis. framer-motion di FAQ.tsx) bikin stacking context sendiri lewat
  // `transform`. Sebelumnya modal ini cuma "fixed inset-0" biasa tanpa
  // z-index eksplisit, jadi kadang ketimpa render konten section lain
  // (bocor keliatan tembus overlay-nya).
  useEffect(() => {
    setMounted(true);
    // Kunci scroll body selama modal terbuka
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  async function handleLogin() {
    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setError("");

    try {
      setLoading(true);

      // Satu endpoint untuk semua role — backend yang menentukan
      // role dari akunnya, tidak perlu dipilih di sini.
      const res = await authApi.login(email, password);

      if (res?.data?.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("role", res.data.user.role);

        // Akun baru / akun yang password-nya baru direset Staf P4M wajib
        // diarahkan ganti password dulu (boleh dilewati di halaman itu),
        // sebelum masuk ke dashboard masing-masing role.
        if (res.data.user.wajibGantiPassword) {
          router.push("/ubah-password");
          return;
        }

        const tujuan = REDIRECT_BY_ROLE[res.data.user.role] || "/login";
        router.push(tujuan);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login gagal. Periksa email dan password.");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-100 flex items-center justify-center overflow-hidden">
      {/* Background gambar penuh (JELAS, tanpa blur) */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/poltek.jpg"
          alt="Polibatam Background"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Lapisan transparan putih (50%) biar card keliatan jelas — sama
          seperti tampilan awal. Anti-tembusnya sekarang ditangani oleh
          portal + z-[100] di atas, bukan dari opacity overlay ini. */}
      <div
        className="absolute inset-0 z-0 bg-white/50"
        onClick={onClose}
      />

      {/* Card Login */}
      <div className="relative z-10 w-full max-w-md bg-[#7C93A7] p-6 sm:p-10 rounded-[20px] sm:rounded-[30px] shadow-2xl mx-4">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-4 right-4 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X size={22} />
          </button>
        )}
        <div className="flex flex-col items-center">
          {/* Logo */}
          <div className="mb-6">
            <Image
              src="/LogoTuntas.png"
              alt="Logo Aplikasi"
              width={120}
              height={120}
              className="object-contain"
              style={{ width: "auto", height: "auto" }}
            />
          </div>

          <h2 className="text-white text-center font-bold text-sm mb-8 uppercase tracking-wider">
            Pengelolaan Ketidaksesuaian <br /> Politeknik Negeri Batam
          </h2>

          {/* Form */}
          <div className="w-full space-y-4">
            {/* Email / Username */}
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">
                Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-gray-600">
                  <User size={18} />
                </span>
                <input
                  type="email"
                  placeholder="xxxx@polibatam.ac.id"
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-[#E8F0FE] text-gray-800 placeholder-gray-500 focus:outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-white text-xs font-semibold mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-gray-600">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-12 pr-12 py-3 rounded-lg bg-[#E8F0FE] text-gray-800 placeholder-gray-500 focus:outline-none [&::-ms-reveal]:hidden [&::-webkit-credentials-picker]:hidden"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-gray-700 transition z-10 cursor-pointer"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && <p className="text-red-200 text-sm text-center">{error}</p>}

            {/* Link Lupa Password & Panduan Pengguna */}
            <div className="flex items-center justify-between text-[12px] pt-1">
              <Link
                href={forgotPasswordPath}
                className="text-blue-200 hover:underline"
              >
                lupa password?
              </Link>

              <a
                href="https://drive.google.com/drive/folders/19wn6yzvK8H9_0qN-Z3LV29k_Ha9nnB9T?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-200 hover:underline"
              >
                panduan pengguna
              </a>
            </div>

            {/* Tombol Back ke Beranda */}
            <div className="pt-1">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-[12px] text-white/80 hover:text-white hover:underline transition"
              >
                <ArrowLeft size={14} />
                <span>Kembali ke Beranda</span>
              </Link>
            </div>
          </div>

          {/* Tombol Login */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-8 w-32 py-2 bg-white text-gray-800 font-bold rounded-full hover:bg-gray-100 transition-all shadow-md disabled:opacity-50"
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}