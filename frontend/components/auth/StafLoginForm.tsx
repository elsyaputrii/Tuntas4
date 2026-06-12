"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

export default function StafLoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false); // ← toggle lihat password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.loginStaf(email, password);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("role", res.data.user.role);

      router.push("/staff-p4m");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  // Tombol lupa password — tampilkan info kontak admin
  function handleLupaPassword() {
    alert(
      "Lupa password?\n\nHubungi Admin P4M untuk reset password:\nEmail: admin@polibatam.ac.id",
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background blur */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/background-polibatam.jpg"
          alt="Polibatam Background"
          fill
          className="object-cover blur-xs brightness-75"
          priority
        />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-[#7C93A7] p-10 rounded-[30px] shadow-2xl mx-4">
        <div className="flex flex-col items-center">
          {/* Logo */}
          <div className="mb-6">
            <Image
              src="/logo-polibatam.png"
              alt="Logo"
              width={120}
              height={120}
              className="object-contain"
            />
          </div>

          {/* Judul */}
          <h2 className="text-white text-center font-bold text-sm mb-2 uppercase tracking-wider">
            Aplikasi Pengelolaan Ketidaksesuaian <br /> Politeknik Negeri Batam
          </h2>
          <p className="text-blue-200 text-[11px] mb-6 uppercase tracking-widest font-semibold">
            Login Staf P4M
          </p>

          <div className="w-full space-y-4">
            {/* Input Email */}
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

            {/* Input Password + Toggle Mata */}
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-gray-600">
                🔒
              </span>
              <input
                type={showPass ? "text" : "password"} // ← toggle type
                placeholder="Enter Password"
                className="w-full pl-12 pr-12 py-3 rounded-lg bg-[#E8F0FE] text-gray-800 placeholder-gray-500 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />

              {/* Tombol mata — klik untuk show/hide password */}
              <button
                type="button"
                onClick={() => setShowPass((prev) => !prev)}
                className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                tabIndex={-1} // supaya tidak ikut tab order
              >
                {showPass ? (
                  // Ikon mata tertutup (password terlihat)
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  // Ikon mata terbuka (password tersembunyi)
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Tombol Lupa Password — sekarang bisa diklik */}

            <button
              type="button"
              onClick={() => router.push("/staff-p4m/forgot-password")}
              className="text-[12px] text-blue-100 hover:text-white hover:underline block text-left w-full mt-1 transition-colors"
            >
              lupa password?
            </button>
          </div>

          {/* Pesan error */}
          {error && (
            <p className="text-red-200 text-xs mt-3 text-center font-medium">
              ⚠️ {error}
            </p>
          )}

          {/* Tombol Login */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-8 w-32 py-2 bg-white text-gray-800 font-bold rounded-full hover:bg-gray-100 transition-all shadow-md disabled:opacity-60"
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
