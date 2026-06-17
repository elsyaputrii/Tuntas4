"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  role: "staf_p4m" | "ka_p4m" | "kepala_unit";
  forgotPasswordPath: string; // contoh: "/staff-p4m/forgot-password"
  redirectAfterLogin: string; // contoh: "/staff-p4m"
}

export default function LoginForm({
  role,
  forgotPasswordPath,
  redirectAfterLogin,
}: LoginFormProps) {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setError("");

    try {
      setLoading(true);

      let res;
      if (role === "staf_p4m") {
        res = await authApi.loginStaf(email, password);
      } else if (role === "ka_p4m") {
        res = await authApi.loginKaP4M(email, password);
      } else {
        res = await authApi.loginKepalaUnit(email, password);
      }

      // Simpan token & data user ke localStorage
      if (res?.data?.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user",  JSON.stringify(res.data.user));
        localStorage.setItem("role",  res.data.user.role); // ✅ BARIS YANG DITAMBAHKAN
        router.push(redirectAfterLogin);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login gagal. Periksa email dan password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
      {/* Background blur */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/poltek.jpg"
          alt="Polibatam Background"
          fill
          className="object-cover blur-xs brightness-75"
          priority
        />
      </div>

      {/* Card Login */}
     <div className="relative z-10 w-full max-w-md bg-[#7C93A7] p-6 sm:p-10 rounded-[20px] sm:rounded-[30px] shadow-2xl mx-4">
        <div className="flex flex-col items-center">

          {/* Logo */}
          <div className="mb-6">
            <Image
              src="/LogoTuntas.png"
              alt="Logo Aplikasi"
              width={120}
              height={120}
              className="object-contain"
            />
          </div>

          <h2 className="text-white text-center font-bold text-sm mb-8 uppercase tracking-wider">
            Pengelolaan Ketidaksesuaian <br /> Politeknik Negeri Batam
          </h2>

          {/* Form */}
          <div className="w-full space-y-4">

            {/* Email */}
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-gray-600">
                👤
              </span>
              <input
                type="email"
                placeholder="Enter Email"
                className="w-full pl-12 pr-4 py-3 rounded-lg bg-[#E8F0FE] text-gray-800 placeholder-gray-500 focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-gray-600">
                🔒
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                className="w-full pl-12 pr-12 py-3 rounded-lg bg-[#E8F0FE] text-gray-800 placeholder-gray-500 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-gray-700 transition z-10 cursor-pointer"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-red-200 text-sm text-center">{error}</p>
            )}

            {/* Link lupa password */}
            <Link
              href={forgotPasswordPath}
              className="text-[12px] text-blue-200 hover:underline block text-left w-full mt-1"
            >
              lupa password?
            </Link>
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
}