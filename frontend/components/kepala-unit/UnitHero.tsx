"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

function getUserField(key: "nama" | "unit"): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    return JSON.parse(raw)[key] || "";
  } catch {
    return "";
  }
}

export default function UnitHero() {
  const router = useRouter();
  const [namaUser] = useState(() => getUserField("nama"));
  const [unit]     = useState(() => getUserField("unit"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    router.replace("/kepala-unit/login");
  };

  return (
    <div className="bg-[#4d5e71] px-4 py-5 sm:px-8 sm:py-8 text-white mb-4 sm:mb-6 shadow-md border-b-4 border-[#5da0dd] flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm sm:text-xl md:text-2xl font-bold leading-tight uppercase">
          Halaman Kerja Kepala Unit
          <span className="hidden sm:inline"><br /></span>
          <span className="sm:hidden"> — </span>
          Aplikasi Pengelolaan Ketidaksesuaian Polibatam
        </h1>
        {(namaUser || unit) && (
          <p className="text-[#5da0dd] text-xs sm:text-sm mt-1 sm:mt-2 truncate">
            {namaUser && <span>{namaUser}</span>}
            {namaUser && unit && <span className="mx-2">·</span>}
            {unit && <span>Unit {unit}</span>}
          </p>
        )}
      </div>
      <button
        onClick={handleLogout}
        className="flex-shrink-0 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-3 py-1.5 sm:px-5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all"
      >
        Logout
      </button>
    </div>
  );
}